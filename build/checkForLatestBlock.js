"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleBlockTxs = exports.checkForLatestBlock = void 0;
const utils_1 = require("./utils");
const encoding_1 = require("@cosmjs/encoding");
const crypto_1 = require("@cosmjs/crypto");
const proto_signing_1 = require("@cosmjs/proto-signing");
const cosmwasm_stargate_1 = require("@cosmjs/cosmwasm-stargate");
const tx_1 = require("cosmjs-types/cosmwasm/wasm/v1/tx");
const variables_1 = require("./variables");
const db_1 = require("./db");
const checkForLatestBlock = async () => {
    // TODO use Promise.any probably since it's not mission-critical that we the latest height
    // See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/race#comparison_with_promise.any
    const currentHeight = await (0, utils_1.getLatestBlockHeight)();
    if (currentHeight === variables_1.lastHeight) {
        // Nothing to see, move along, solider
        return;
    }
    if (variables_1.lastHeight !== 0 && currentHeight - variables_1.lastHeight !== 1) {
        await (0, utils_1.checkForMissedBlocks)();
    }
    // Logic for new block that came in
    (0, variables_1.updateLastHeight)(currentHeight);
    console.log('New block height:', currentHeight);
    let block;
    try {
        block = await (0, utils_1.getBlockInfo)(currentHeight);
        (0, utils_1.v)('block', block);
        const blockTime = block.block.header.time;
        const isoBlockTime = new Date(blockTime.toISOString()).toISOString();
        const blockTxs = block.block.txs;
        (0, exports.handleBlockTxs)(currentHeight, blockTxs, isoBlockTime);
    }
    catch (e) {
        console.warn(`Issue trying to get block info for height ${currentHeight}`);
    }
};
exports.checkForLatestBlock = checkForLatestBlock;
const handleBlockTxs = async (height, blockTxs, isoBlockTime) => {
    if (blockTxs.length === 0) {
        // Update the array knowing that we saw it, then bail
        await (0, utils_1.addSeenHeight)(height);
        variables_1.emptyHeights.add(height);
        return;
    }
    // Insert chain info into database (chain_network)
    const chainNetworkFkId = await (0, db_1.insertChainInfo)({
        chainIdPrefix: variables_1.CHAIN_ID_PREFIX
    });
    // Just look for (and include) WasmExecute messages
    let wasmExecTxs = [];
    blockTxs.forEach(tx => {
        let simpleTx = {
            hash: (0, encoding_1.toHex)((0, crypto_1.sha256)(tx)),
            memo: '',
            msgs: []
        };
        const decodedTx = (0, proto_signing_1.decodeTxRaw)(tx);
        (0, utils_1.v)('decodedTx', decodedTx);
        simpleTx.memo = decodedTx.body.memo;
        let wasmExecMsgs = [];
        decodedTx.body.messages.forEach(m => {
            if ((0, cosmwasm_stargate_1.isMsgExecuteEncodeObject)(m)) {
                let msg = tx_1.MsgExecuteContract.decode(m.value);
                (0, utils_1.v)('msg', msg);
                // Check if this is among the contracts we care about
                if (!variables_1.contractAddresses.includes(msg.contract)) {
                    // console.log(`Called a contract ${msg.contract} but it's not one of ours`)
                }
                else {
                    const innerMsg = JSON.parse(Buffer.from(msg.msg).toString());
                    (0, utils_1.v)('innerMsg', innerMsg);
                    msg.msg = innerMsg;
                    wasmExecMsgs.push(msg);
                }
                (0, utils_1.v)('msg', msg);
            }
        });
        if (wasmExecMsgs.length !== 0) {
            simpleTx.msgs = wasmExecMsgs;
            wasmExecTxs.push(simpleTx);
        }
    });
    if (wasmExecTxs.length !== 0) {
        console.log('Found transaction(s) interacting with a contract on this block…');
        await (0, utils_1.addSeenHeight)(height);
        // Go on to save the block information
        const blockDetail = {
            height,
            time: isoBlockTime,
            txs: wasmExecTxs
        };
        await saveBlock(blockDetail, chainNetworkFkId);
    }
    else {
        // No relevant txs
        await (0, utils_1.addSeenHeight)(height);
        variables_1.emptyHeights.add(height);
    }
};
exports.handleBlockTxs = handleBlockTxs;
const saveBlock = async (blockDetail, chainNetworkFkId) => {
    const height = blockDetail.height;
    const time = blockDetail.time;
    variables_1.blockMap.set(height, blockDetail);
    let blockEntry;
    let txEntry;
    // We'll want to keep track of which contracts we're watching had action in this block
    let contractsInvolvedInBlock = new Map();
    // I suppose this can happen if the RPC returns way later when a block has already been caught
    // and handled as a missing block
    try {
        blockEntry = await (0, variables_1.db)('blocks')
            .insert({
            height,
            time,
            fk_chain_network_id: chainNetworkFkId,
        }, 'id');
        const blockIdFk = blockEntry[0].id;
        for (const tx of blockDetail.txs) {
            txEntry = await (0, variables_1.db)('transactions')
                .insert({
                fk_block_id: blockIdFk,
                hash: tx.hash,
                msg_detail: JSON.stringify(tx.msgs)
            }, 'id');
            for (const msg of tx.msgs) {
                const fnKey = Object.keys(msg.msg)[0];
                // Insert each message inside the transaction
                await (0, variables_1.db)('messages')
                    .insert({
                    fk_tx_id: txEntry[0].id,
                    sender: msg.sender,
                    contract: msg.contract,
                    fn: fnKey,
                    args: msg.msg[fnKey]
                });
                // Insert contract if it's not in the database yet
                // TODO: There's likely a better way at https://knexjs.org/guide but this will work
                let contractResp = await (0, variables_1.db)('contracts')
                    .where({
                    fk_chain_network_id: chainNetworkFkId,
                    address: msg.contract
                })
                    .select('id');
                if (contractResp.length === 0) {
                    contractResp = await (0, variables_1.db)('contracts')
                        .insert({
                        fk_chain_network_id: chainNetworkFkId,
                        address: msg.contract
                    }, 'id');
                }
                // Add entry to map of contract address » id (primary key in contracts table)
                contractsInvolvedInBlock.set(msg.contract, contractResp[0].id);
            }
        }
        // Now let's fill out the contract_block_piv (pivot table including the contract's code ID at this height)
        // Trip out, thanks SO: https://stackoverflow.com/a/50874507/711863
        for await (const contractDBInfo of contractsInvolvedInBlock) {
            const contractAddress = contractDBInfo[0]; // juno1abc…
            const contractFkId = contractDBInfo[1]; // 6
            const contractInfoResp = await (0, utils_1.getContractInfo)(contractAddress);
            const codeId = (0, utils_1.bigIntMe)(contractInfoResp.contractInfo.codeId);
            await (0, variables_1.db)('contract_block_piv')
                .insert({
                fk_contract_id: contractFkId,
                fk_block_id: blockIdFk,
                code_id: codeId
            });
        }
    }
    catch (e) {
        console.error(`Issue inserting height or transactions: ${height}`, e);
    }
    // If above limit, shave it down
    if (variables_1.blockHeights.length > variables_1.CACHE_LIMIT) {
        // Remove from Map
        const removeKeys = variables_1.blockHeights.slice(variables_1.CACHE_LIMIT);
        for (const k of removeKeys) {
            // It's possible this will fail (return false) and that's okay
            variables_1.blockMap.delete(k);
        }
        (0, variables_1.updateBlockHeights)(variables_1.blockHeights.slice(0, variables_1.CACHE_LIMIT));
        variables_1.emptyHeights.forEach(height => {
            if (height < variables_1.blockHeights[variables_1.blockHeights.length - 1]) {
                variables_1.emptyHeights.delete(height);
            }
        });
    }
};
