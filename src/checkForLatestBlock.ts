import {
    addSeenHeight,
    bigIntMe,
    checkForMissedBlocks,
    getBlockInfo,
    getContractInfo,
    getLatestBlockHeight, v,
} from "./utils";
import {SimpleTx} from "./interfaces";
import {toHex} from "@cosmjs/encoding";
import {sha256} from "@cosmjs/crypto";
import {decodeTxRaw} from "@cosmjs/proto-signing";
import {isMsgExecuteEncodeObject} from "@cosmjs/cosmwasm-stargate";
import {MsgExecuteContract} from "cosmjs-types/cosmwasm/wasm/v1/tx";
import {
    blockHeights,
    blockMap, CACHE_LIMIT,
    CHAIN_ID_PREFIX,
    contractAddresses,
    db,
    emptyHeights,
    lastHeight,
    updateBlockHeights,
    updateLastHeight
} from "./variables";
import {insertChainInfo} from "./db";
import {QueryContractInfoResponse} from "cosmjs-types/cosmwasm/wasm/v1/query";
import {BlockResponse} from "@cosmjs/tendermint-rpc";

export const checkForLatestBlock = async () => {
    // TODO use Promise.any probably since it's not mission-critical that we the latest height
    // See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/race#comparison_with_promise.any
    const currentHeight = await getLatestBlockHeight()
    if (currentHeight === lastHeight) {
        // Nothing to see, move along, solider
        return
    }
    // Logic for new block that came in
    updateLastHeight(currentHeight)
    console.log('New block height:', currentHeight)
    let block: BlockResponse
    try {
        block = await getBlockInfo(currentHeight)
        v('block', block)
        const blockTime = block.block.header.time
        const isoBlockTime: string = new Date(blockTime.toISOString()).toISOString()
        const blockTxs = block.block.txs

        handleBlockTxs(currentHeight, blockTxs, isoBlockTime)
    } catch (e) {
        console.warn(`Issue trying to get block info for height ${currentHeight}`)
    }
}

export const handleBlockTxs = async (height: number, blockTxs, isoBlockTime: string) => {
    if (blockTxs.length === 0) {
        // Update the array knowing that we saw it, then bail
        await addSeenHeight(height)
        emptyHeights.add(height)
        return
    }

    // Insert chain info into database (chain_network)
    const chainNetworkFkId = await insertChainInfo({
        chainIdPrefix: CHAIN_ID_PREFIX
    })

    // Just look for (and include) WasmExecute messages
    let wasmExecTxs = []
    blockTxs.forEach(tx => {
        let simpleTx: SimpleTx = {
            hash: toHex(sha256(tx)),
            memo: '',
            msgs: []
        };

        const decodedTx = decodeTxRaw(tx)
        v('decodedTx', decodedTx)
        simpleTx.memo = decodedTx.body.memo
        let wasmExecMsgs = []
        decodedTx.body.messages.forEach(m => {
            if (isMsgExecuteEncodeObject(m)) {
                let msg = MsgExecuteContract.decode(m.value)
                v('msg', msg)
                // Check if this is among the contracts we care about
                if (!contractAddresses.includes(msg.contract)) {
                    // console.log(`Called a contract ${msg.contract} but it's not one of ours`)
                } else {
                    const innerMsg = JSON.parse(Buffer.from(msg.msg).toString())
                    v('innerMsg', innerMsg)
                    msg.msg = innerMsg
                    wasmExecMsgs.push(msg)
                }
                v('msg', msg)
            }
        })
        if (wasmExecMsgs.length !== 0) {
            simpleTx.msgs = wasmExecMsgs
            wasmExecTxs.push(simpleTx)
        }
    })

    if (wasmExecTxs.length !== 0) {
        console.log('Found transaction(s) interacting with our contract(s) on this block…')
        await addSeenHeight(height)
        // Go on to save the block information
        const blockDetail = {
            height,
            time: isoBlockTime,
            txs: wasmExecTxs
        }
        await saveBlock(blockDetail, chainNetworkFkId)
    } else {
        // No relevant txs
        await addSeenHeight(height)
        emptyHeights.add(height)
    }
}

const saveBlock = async (blockDetail, chainNetworkFkId) => {
    const height = blockDetail.height
    const time = blockDetail.time
    blockMap.set(height, blockDetail)

    let blockEntry
    let txEntry
    // We'll want to keep track of which contracts we're watching had action in this block
    let contractsInvolvedInBlock = new Map()
    // I suppose this can happen if the RPC returns way later when a block has already been caught
    // and handled as a missing block
    try {
        blockEntry = await db('js_blocks')
            .insert({
                height,
                time,
                fk_chain_network_id: chainNetworkFkId,
            }, 'id')
        const blockIdFk = blockEntry[0].id
        for (const tx of blockDetail.txs) {
            txEntry = await db('js_transactions')
                .insert({
                    fk_block_id: blockIdFk,
                    hash: tx.hash,
                    msg_detail: JSON.stringify(tx.msgs)
                }, 'id')
            for (const msg of tx.msgs) {
                const fnKey = Object.keys(msg.msg)[0]
                // Insert each message inside the transaction
                await db('js_messages')
                    .insert({
                        fk_tx_id: txEntry[0].id,
                        sender: msg.sender,
                        contract: msg.contract,
                        fn: fnKey,
                        args: msg.msg[fnKey]
                    })
                // Insert contract if it's not in the database yet
                // TODO: There's likely a better way at https://knexjs.org/guide but this will work
                let contractResp = await db('js_contracts')
                    .where({
                        fk_chain_network_id: chainNetworkFkId,
                        address: msg.contract
                    })
                    .select('id')
                if (contractResp.length === 0) {
                    contractResp = await db('js_contracts')
                    .insert({
                        fk_chain_network_id: chainNetworkFkId,
                        address: msg.contract
                    }, 'id')
                }
                // Add entry to map of contract address » id (primary key in contracts table)
                contractsInvolvedInBlock.set(msg.contract, contractResp[0].id)
            }
        }

        // Now let's fill out the contract_block_piv (pivot table including the contract's code ID at this height)
        // Trip out, thanks SO: https://stackoverflow.com/a/50874507/711863
        for await (const contractDBInfo of contractsInvolvedInBlock) {
            const contractAddress = contractDBInfo[0] // juno1abc…
            const contractFkId = contractDBInfo[1] // 6
            const contractInfoResp: QueryContractInfoResponse = await getContractInfo(contractAddress);
            const codeId = bigIntMe(contractInfoResp.contractInfo.codeId)
            await db('js_contract_block_piv')
                .insert({
                    fk_contract_id: contractFkId,
                    fk_block_id: blockIdFk,
                    code_id: codeId
                })
        }
    } catch (e) {
        console.error(`Issue inserting height or transactions: ${height}`, e)
    }

    // If above limit, shave it down
    if (blockHeights.length > CACHE_LIMIT) {
        // Remove from Map
        const removeKeys = blockHeights.slice(CACHE_LIMIT)
        for (const k of removeKeys) {
            // It's possible this will fail (return false) and that's okay
            blockMap.delete(k)
        }
        updateBlockHeights(blockHeights.slice(0, CACHE_LIMIT))
        emptyHeights.forEach(height => {
            if (height < blockHeights[blockHeights.length - 1]) {
                emptyHeights.delete(height);
            }
        });
    }
}
