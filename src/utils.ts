import * as util from "util";
import {setupWasmExtension} from "@cosmjs/cosmwasm-stargate";
import {handleBlockTxs} from "./checkForLatestBlock";
import {
    ADD_RPC_ADDRESSES, ADD_RPC_ADDRESSES_ALWAYS,
    allRPCConnections,
    blockHeights,
    RPC_LIMIT,
    setAllRPCConnections, SKIP_RPC_ADDRESSES, TIMEOUT,
    updateBlockHeights, updateBlocksTimerId, VERBOSITY
} from "./variables";
import {BlockResponse, HttpBatchClient, Tendermint34Client, TxResponse} from "@cosmjs/tendermint-rpc";
import {QueryClient} from "@cosmjs/stargate";
import {
    QueryContractInfoResponse,
    QuerySmartContractStateRequest,
    QuerySmartContractStateResponse
} from "cosmjs-types/cosmwasm/wasm/v1/query";
import {Chain, RpcConnection} from "./interfaces";
import {fromHex} from "@cosmjs/encoding";

// Copied from cosmjs-types
declare const self: any | undefined;
declare const window: any | undefined;
declare const global: any | undefined;
// Guess you can't change "var" below :shrug:
var globalThis: any = (() => {
    if (typeof globalThis !== "undefined") {
        return globalThis;
    }
    if (typeof self !== "undefined") {
        return self;
    }
    if (typeof window !== "undefined") {
        return window;
    }
    if (typeof global !== "undefined") {
        return global;
    }
    throw "Unable to locate global object";
})();

export const base64FromBytes = (arr) => {
    if (globalThis.Buffer) {
        return globalThis.Buffer.from(arr).toString("base64");
    } else {
        const bin = [];
        arr.forEach((byte) => {
            bin.push(String.fromCharCode(byte));
        });
        // TODO: fix this deprecated btoa
        return globalThis.btoa(bin.join(""));
    }
}

// Verbose console log, basically
// This offers a more verbose way to display an object
// avoiding showing stuff like [Object object]
export const v = (message, data) => {
    if (VERBOSITY === true) {
        console.log(message, util.inspect(data, false, null, true))
    }
}

// Not tremendously important to get right yet
// Half-finished work here
// We're basically trying to keep track of all heights we're aware of
export const addSeenHeight = async (height) => {
    if (blockHeights.length === 0) {
        blockHeights.push(height)
    } else if (blockHeights.length && height > blockHeights[0]) {
        blockHeights.unshift(height)
    } else if (blockHeights.length && height < blockHeights[0] && height > blockHeights[blockHeights.length -1]) {
        // Jam it in the correct place
        let lastIndex = blockHeights.slice().reverse().findIndex(h => h > height)
        // console.log('blockHeights probably out of order lastIndex', lastIndex)

        let firstHalf = blockHeights.slice(0, lastIndex)
        // console.log('blockHeights probably out of order firstHalf', firstHalf)
        firstHalf.push(height)
        // console.log('blockHeights probably out of order firstHalf after push', firstHalf)

        const secondHalf = blockHeights.slice(lastIndex)
        // console.log('blockHeights probably out of order secondHalf', secondHalf)
        updateBlockHeights(firstHalf.concat(secondHalf))
        // console.log('blockHeights probably out of order concatted', blockHeights)
        // gahhh why. lazy thing, need it working
        blockHeights.sort((a, b) => b - a) // desc
    } else {
        // console.log('else stuff for height', height)
    }
}

export const checkForMissedBlocks = async () => {
    let keepGoing = false
    // We use length - 1 since we can't compare past that
    for (let i = 0; i < blockHeights.length - 1; i++) {
        // Go until we see the first gap, keep it simple
        // blockHeights[i] can't be less or equal to blockHeights[i + 1]
        if (blockHeights[i] - blockHeights[i + 1] > 1) {
            keepGoing = true
            // Do stuff to add block
            const missingBlockNum = blockHeights[i] - 1
            const block = await getBlockInfo(missingBlockNum)
            const blockTxs = block.block.txs
            const blockTime = block.block.header.time;
            const isoBlockTime = new Date(blockTime.toISOString()).toISOString()
            v('isoBlockTime', isoBlockTime)

            console.log('Fixing missed block', missingBlockNum)
            await handleBlockTxs(missingBlockNum, blockTxs, isoBlockTime)
        }
    }
    updateBlocksTimerId(setTimeout(checkForMissedBlocks, TIMEOUT));
}

// Credit to Fisher-Yates, SO and eventually https://www.webmound.com/shuffle-javascript-array
export const shuffleRPCs = (rpcs) => {
    rpcs.reverse().forEach((item, index) => {
        const j = Math.floor(Math.random() * (index + 1));
        [rpcs[index], rpcs[j]] = [rpcs[j], rpcs[index]];
    });

    return rpcs;
};

export const setRPCClients = async (chains: Chain[]) => {
    let newRPCs = []
    for (let i = 0; i < chains.length; i++) {
        const address = chains[i].address
        try {
            const httpBatchClient = new HttpBatchClient(address, {
                batchSizeLimit: 5,
                dispatchInterval: TIMEOUT
            })
            const client: any = await Tendermint34Client.create(httpBatchClient)
            const queryClient = QueryClient.withExtensions(client, setupWasmExtension)
            let rpcConnection: RpcConnection = {
                client,
                queryClient
            }
            if (newRPCs.length < RPC_LIMIT) {
                newRPCs.push(rpcConnection)
            } else {
                break
            }
        } catch (e) {
            // Sometimes, chain-registry will have an outdated endpoint and so on. It's fine, carry on
            console.warn('Looks like chain-registry (or one of the ones added via ADD_RPC_ADDRESSES) has an issue. Skipping. Errors details…', {
                rpc: address,
                errorCode: e.code
            })
        }
    }

    // Add all RPCs specified in ADD_RPC_ADDRESSES_ALWAYS env var, which is
    // the only time we're allowed to exceed the RPC_LIMIT
    for (const alwaysRPCAddress of ADD_RPC_ADDRESSES_ALWAYS) {
        try {
            const client: any = await Tendermint34Client.connect(alwaysRPCAddress)
            const queryClient = QueryClient.withExtensions(client, setupWasmExtension)
            let alwaysRPCConnection: RpcConnection = {
                client,
                queryClient
            }
            newRPCs.push(alwaysRPCConnection)
        } catch (e) {
            console.warn('An endpoint in ADD_RPC_ADDRESSES_ALWAYS has an issue connecting. Errors details…', {
                rpc: alwaysRPCAddress,
                errorCode: e.code
            })
        }
    }

    setAllRPCConnections(newRPCs)
}

export const bigIntMe = (theNotBigIntYet) => {
    return BigInt.asUintN(128, theNotBigIntYet)
}

// Quite a useful function to send a query message to a contract at a given block height
export const queryContractAtHeight = async (address: string, args: object, height: number) => {
    // Turn JSON object into a string, then into buffer of bytes
    const queryReadableBytes = Buffer.from(JSON.stringify(args))
    const queryBase64 = base64FromBytes(queryReadableBytes)

    const requestContractData = QuerySmartContractStateRequest.encode({
            address,
            queryData: queryBase64
        }).finish()

    const queryRespEncoded = await queryUnverified('/cosmwasm.wasm.v1.Query/SmartContractState', requestContractData, height);
    const queryResponseDecoded = QuerySmartContractStateResponse.decode(queryRespEncoded)
    const queryResponseBase64DecodedData = base64FromBytes(queryResponseDecoded.data)
    // TODO: atob seems to be deprecated, let's update it
    const queryResponseRawJson = atob(queryResponseBase64DecodedData);
    const queryResponseJson = JSON.parse(queryResponseRawJson)
    return queryResponseJson
}

export const skipRPCs = (rpcs: Chain[]): Chain[] => {
    let res = []
    for (let i = 0; i < rpcs.length; i++) {
        const rpc = rpcs[i]
        if (!SKIP_RPC_ADDRESSES.includes(rpc.address)) res.push(rpc)
    }
    return res
}

export const addRPCs = (rpcs: Chain[]): Chain[] => {
    let res: Chain[] = rpcs
    const allCurrentRPCAddress = rpcs.map(rpc => rpc.address)
    for (const rpcAddress of ADD_RPC_ADDRESSES) {
        // Don't add if it's already there
        if (allCurrentRPCAddress.includes(rpcAddress)) continue
        rpcs.push({
            address: rpcAddress
        })
    }

    return res
}

export const getLatestBlockHeight = async (): Promise<number> => {
    // This uses the "regular" client, not the QueryClient
    const clientStatuses = allRPCConnections.map(conn => conn.client.status())

    const firstBlockHeight = (await Promise.any(clientStatuses)).syncInfo.latestBlockHeight
    return firstBlockHeight
}

export const getBlockInfo = async (height: number): Promise<BlockResponse> => {
    // This uses the "regular" client, not the QueryClient
    const clientBlocks = allRPCConnections.map(conn => conn.client.block(height))

    const blockDetails = await Promise.any(clientBlocks)
    return blockDetails
}

export const getTxInfo = async (hash: string): Promise<TxResponse> => {
    const txHash = Buffer.from(fromHex(hash))
    const clientTxs = allRPCConnections.map(conn => conn.client.tx({hash: txHash}))
    const txDetails = await Promise.any(clientTxs)
    return txDetails
}

export const queryUnverified = async (path: string, requestObj: any, height: number): Promise<any> => {
    const queryClientUnverifieds = allRPCConnections.map(conn => conn.queryClient.queryUnverified(path, requestObj, height))
    const queryRespEncoded = await Promise.any(queryClientUnverifieds)
    return queryRespEncoded
}

export const getContractInfo = async (address): Promise<QueryContractInfoResponse> => {
    const queryClientContractInfos = allRPCConnections.map(conn => conn.queryClient.wasm.getContractInfo(address))
    const queryContractInfo = await Promise.any(queryClientContractInfos)
    return queryContractInfo
}
