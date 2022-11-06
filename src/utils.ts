import * as util from "util";
import {setupWasmExtension} from "@cosmjs/cosmwasm-stargate";
import {handleBlockTxs} from "./checkForLatestBlock";
import {
    allRPCClients,
    blockHeights,
    RPC_LIMIT,
    rpcAddress,
    setTmClient, setTmClientQuery,
    thisChain, tmClient, tmClientQuery,
    updateBlockHeights
} from "./variables";
import {Tendermint34Client} from "@cosmjs/tendermint-rpc";
import {QueryClient} from "@cosmjs/stargate";
import {QuerySmartContractStateRequest, QuerySmartContractStateResponse} from "cosmjs-types/cosmwasm/wasm/v1/query";

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

// Currently unused
export function bytesFromBase64(b64) {
    if (globalThis.Buffer) {
        return Uint8Array.from(globalThis.Buffer.from(b64, "base64"));
    } else {
        const bin = globalThis.atob(b64);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; ++i) {
            arr[i] = bin.charCodeAt(i);
        }
        return arr;
    }
}

export const base64FromBytes = (arr) => {
    if (globalThis.Buffer) {
        return globalThis.Buffer.from(arr).toString("base64");
    } else {
        const bin = [];
        arr.forEach((byte) => {
            bin.push(String.fromCharCode(byte));
        });
        return globalThis.btoa(bin.join(""));
    }
}

// Verbose console log, basically
// This offers a more verbose way to display an object
// avoiding showing stuff like [Object object]
export const v = (message, data) => {
    console.log(message, util.inspect(data, false, null, true))
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

export const checkForMissedBlocks = async (tmClient) => {
    let keepGoing = false
    // We use length - 1 since we can't compare past that
    for (let i = 0; i < blockHeights.length - 1; i++) {
        // Go until we see the first gap, keep it simple
        if (blockHeights[i] - blockHeights[i + 1] !== 1) {
            keepGoing = true
            // Do stuff to add block
            const missingBlockNum = blockHeights[i] - 1
            const block = await tmClient.block(missingBlockNum)
            const blockTxs = block.block.txs
            const blockTime = block.block.header.time;
            const isoBlockTime = new Date(blockTime).toISOString()
            // v('isoBlockTime', isoBlockTime)

            console.log('Fixing missed block', missingBlockNum)
            await handleBlockTxs(missingBlockNum, blockTxs, isoBlockTime)
            // We can just do one at a time
            break;
        }
    }
}

export const getAllRPCClients = async () => {
    for (let i = 0; i < thisChain.apis.rpc.length; i++) {
        const address = thisChain.apis.rpc[i].address
        try {
            const client: Tendermint34Client = await Tendermint34Client.connect(address)
            if (allRPCClients.length < RPC_LIMIT) {
                allRPCClients.push(client)
            } else {
                break
            }
        } catch (e) {
            // Sometimes, chain-registry will have an outdated endpoint, carry on
            console.warn('Looks like chain-registry has an issue with this RPC', {
                rpc: address,
                error: e
            })
        }
    }

    // oh yeah, I did not finish having the connections crawl along the list from chain-registry
    setTmClient(await Tendermint34Client.connect(rpcAddress))
    console.log('setting up wasm extension here')
    setTmClientQuery(QueryClient.withExtensions(tmClient, setupWasmExtension))
}

export const bigIntMe = (theNotBigIntYet) => {
    return BigInt.asUintN(128, theNotBigIntYet)
}

// Quite a useful function to send a query message to a contract at a given block height
export const queryContractAtHeight = async (address: string, args: object, height: number) => {
    // Turn JSON object into a string, then into buffer of bytes
    const queryReadableBytes = Buffer.from(JSON.stringify(args))
    const queryBase64 = base64FromBytes(queryReadableBytes)
    const requestContractData = Uint8Array.from(
        QuerySmartContractStateRequest.encode({
            address,
            queryData: queryBase64
        }).finish()
    )
    const queryRespEncoded = await tmClientQuery.queryUnverified(`/cosmwasm.wasm.v1.Query/SmartContractState`, requestContractData, height);
    const queryResponseDecoded = QuerySmartContractStateResponse.decode(queryRespEncoded)
    const queryResponseBase64DecodedData = base64FromBytes(queryResponseDecoded.data)
    // TODO: atob seems to be deprecated, let's update it
    const queryResponseRawJson = atob(queryResponseBase64DecodedData);
    const queryResponseJson = JSON.parse(queryResponseRawJson)
    return queryResponseJson
}
