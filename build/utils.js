"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContractInfo = exports.queryUnverified = exports.getTxInfo = exports.getBlockInfo = exports.getLatestBlockHeight = exports.queryContractAtHeight = exports.bigIntMe = exports.setRPCClients = exports.checkForMissedBlocks = exports.addSeenHeight = exports.v = exports.base64FromBytes = void 0;
const util = __importStar(require("util"));
const cosmwasm_stargate_1 = require("@cosmjs/cosmwasm-stargate");
const checkForLatestBlock_1 = require("./checkForLatestBlock");
const variables_1 = require("./variables");
const tendermint_rpc_1 = require("@cosmjs/tendermint-rpc");
const stargate_1 = require("@cosmjs/stargate");
const query_1 = require("cosmjs-types/cosmwasm/wasm/v1/query");
const encoding_1 = require("@cosmjs/encoding");
// Guess you can't change "var" below :shrug:
var globalThis = (() => {
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
const base64FromBytes = (arr) => {
    if (globalThis.Buffer) {
        return globalThis.Buffer.from(arr).toString("base64");
    }
    else {
        const bin = [];
        arr.forEach((byte) => {
            bin.push(String.fromCharCode(byte));
        });
        // TODO: fix this deprecated btoa
        return globalThis.btoa(bin.join(""));
    }
};
exports.base64FromBytes = base64FromBytes;
// Verbose console log, basically
// This offers a more verbose way to display an object
// avoiding showing stuff like [Object object]
const v = (message, data) => {
    console.log(message, util.inspect(data, false, null, true));
};
exports.v = v;
// Not tremendously important to get right yet
// Half-finished work here
// We're basically trying to keep track of all heights we're aware of
const addSeenHeight = async (height) => {
    if (variables_1.blockHeights.length === 0) {
        variables_1.blockHeights.push(height);
    }
    else if (variables_1.blockHeights.length && height > variables_1.blockHeights[0]) {
        variables_1.blockHeights.unshift(height);
    }
    else if (variables_1.blockHeights.length && height < variables_1.blockHeights[0] && height > variables_1.blockHeights[variables_1.blockHeights.length - 1]) {
        // Jam it in the correct place
        let lastIndex = variables_1.blockHeights.slice().reverse().findIndex(h => h > height);
        // console.log('blockHeights probably out of order lastIndex', lastIndex)
        let firstHalf = variables_1.blockHeights.slice(0, lastIndex);
        // console.log('blockHeights probably out of order firstHalf', firstHalf)
        firstHalf.push(height);
        // console.log('blockHeights probably out of order firstHalf after push', firstHalf)
        const secondHalf = variables_1.blockHeights.slice(lastIndex);
        // console.log('blockHeights probably out of order secondHalf', secondHalf)
        (0, variables_1.updateBlockHeights)(firstHalf.concat(secondHalf));
        // console.log('blockHeights probably out of order concatted', blockHeights)
        // gahhh why. lazy thing, need it working
        variables_1.blockHeights.sort((a, b) => b - a); // desc
    }
    else {
        // console.log('else stuff for height', height)
    }
};
exports.addSeenHeight = addSeenHeight;
const checkForMissedBlocks = async () => {
    let keepGoing = false;
    // We use length - 1 since we can't compare past that
    for (let i = 0; i < variables_1.blockHeights.length - 1; i++) {
        // Go until we see the first gap, keep it simple
        if (variables_1.blockHeights[i] - variables_1.blockHeights[i + 1] !== 1) {
            keepGoing = true;
            // Do stuff to add block
            const missingBlockNum = variables_1.blockHeights[i] - 1;
            const block = await (0, exports.getBlockInfo)(missingBlockNum);
            const blockTxs = block.block.txs;
            const blockTime = block.block.header.time;
            const isoBlockTime = new Date(blockTime.toISOString()).toISOString();
            // v('isoBlockTime', isoBlockTime)
            console.log('Fixing missed block', missingBlockNum);
            await (0, checkForLatestBlock_1.handleBlockTxs)(missingBlockNum, blockTxs, isoBlockTime);
        }
    }
};
exports.checkForMissedBlocks = checkForMissedBlocks;
const setRPCClients = async (chains) => {
    let newRPCs = [];
    for (let i = 0; i < chains.length; i++) {
        const address = chains[i].address;
        try {
            const client = await tendermint_rpc_1.Tendermint34Client.connect(address);
            const queryClient = stargate_1.QueryClient.withExtensions(client, cosmwasm_stargate_1.setupWasmExtension);
            let rpcConnection = {
                client,
                queryClient
            };
            if (newRPCs.length < variables_1.RPC_LIMIT) {
                newRPCs.push(rpcConnection);
            }
            else {
                break;
            }
        }
        catch (e) {
            // Sometimes, chain-registry will have an outdated endpoint, carry on
            console.warn('Looks like chain-registry has an issue with this RPC', {
                rpc: address,
                errorCode: e.code
            });
        }
    }
    (0, variables_1.setAllRPCConnections)(newRPCs);
};
exports.setRPCClients = setRPCClients;
const bigIntMe = (theNotBigIntYet) => {
    return BigInt.asUintN(128, theNotBigIntYet);
};
exports.bigIntMe = bigIntMe;
// Quite a useful function to send a query message to a contract at a given block height
const queryContractAtHeight = async (address, args, height) => {
    // Turn JSON object into a string, then into buffer of bytes
    const queryReadableBytes = Buffer.from(JSON.stringify(args));
    const queryBase64 = (0, exports.base64FromBytes)(queryReadableBytes);
    const requestContractData = query_1.QuerySmartContractStateRequest.encode({
        address,
        queryData: queryBase64
    }).finish();
    const queryRespEncoded = await (0, exports.queryUnverified)('/cosmwasm.wasm.v1.Query/SmartContractState', requestContractData, height);
    const queryResponseDecoded = query_1.QuerySmartContractStateResponse.decode(queryRespEncoded);
    const queryResponseBase64DecodedData = (0, exports.base64FromBytes)(queryResponseDecoded.data);
    // TODO: atob seems to be deprecated, let's update it
    const queryResponseRawJson = atob(queryResponseBase64DecodedData);
    const queryResponseJson = JSON.parse(queryResponseRawJson);
    return queryResponseJson;
};
exports.queryContractAtHeight = queryContractAtHeight;
const getLatestBlockHeight = async () => {
    // This uses the "regular" client, not the QueryClient
    const clientStatuses = variables_1.allRPCConnections.map(conn => conn.client.status());
    const firstBlockHeight = (await Promise.any(clientStatuses)).syncInfo.latestBlockHeight;
    return firstBlockHeight;
};
exports.getLatestBlockHeight = getLatestBlockHeight;
const getBlockInfo = async (height) => {
    // This uses the "regular" client, not the QueryClient
    const clientBlocks = variables_1.allRPCConnections.map(conn => conn.client.block(height));
    const blockDetails = await Promise.any(clientBlocks);
    return blockDetails;
};
exports.getBlockInfo = getBlockInfo;
const getTxInfo = async (hash) => {
    const txHash = Buffer.from((0, encoding_1.fromHex)(hash));
    const clientTxs = variables_1.allRPCConnections.map(conn => conn.client.tx({ hash: txHash }));
    const txDetails = await Promise.any(clientTxs);
    return txDetails;
};
exports.getTxInfo = getTxInfo;
const queryUnverified = async (path, requestObj, height) => {
    const queryClientUnverifieds = variables_1.allRPCConnections.map(conn => conn.queryClient.queryUnverified(path, requestObj, height));
    const queryRespEncoded = await Promise.any(queryClientUnverifieds);
    return queryRespEncoded;
};
exports.queryUnverified = queryUnverified;
const getContractInfo = async (address) => {
    const queryClientContractInfos = variables_1.allRPCConnections.map(conn => conn.queryClient.wasm.getContractInfo(address));
    const queryContractInfo = await Promise.any(queryClientContractInfos);
    return queryContractInfo;
};
exports.getContractInfo = getContractInfo;
