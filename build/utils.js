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
exports.queryContractAtHeight = exports.bigIntMe = exports.getAllRPCClients = exports.checkForMissedBlocks = exports.addSeenHeight = exports.v = exports.base64FromBytes = exports.bytesFromBase64 = void 0;
const util = __importStar(require("util"));
const cosmwasm_stargate_1 = require("@cosmjs/cosmwasm-stargate");
const checkForLatestBlock_1 = require("./checkForLatestBlock");
const variables_1 = require("./variables");
const tendermint_rpc_1 = require("@cosmjs/tendermint-rpc");
const stargate_1 = require("@cosmjs/stargate");
const query_1 = require("cosmjs-types/cosmwasm/wasm/v1/query");
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
// Currently unused
function bytesFromBase64(b64) {
    if (globalThis.Buffer) {
        return Uint8Array.from(globalThis.Buffer.from(b64, "base64"));
    }
    else {
        const bin = globalThis.atob(b64);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; ++i) {
            arr[i] = bin.charCodeAt(i);
        }
        return arr;
    }
}
exports.bytesFromBase64 = bytesFromBase64;
const base64FromBytes = (arr) => {
    if (globalThis.Buffer) {
        return globalThis.Buffer.from(arr).toString("base64");
    }
    else {
        const bin = [];
        arr.forEach((byte) => {
            bin.push(String.fromCharCode(byte));
        });
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
const checkForMissedBlocks = async (tmClient) => {
    let keepGoing = false;
    // We use length - 1 since we can't compare past that
    for (let i = 0; i < variables_1.blockHeights.length - 1; i++) {
        // Go until we see the first gap, keep it simple
        if (variables_1.blockHeights[i] - variables_1.blockHeights[i + 1] !== 1) {
            keepGoing = true;
            // Do stuff to add block
            const missingBlockNum = variables_1.blockHeights[i] - 1;
            const block = await tmClient.block(missingBlockNum);
            const blockTxs = block.block.txs;
            const blockTime = block.block.header.time;
            const isoBlockTime = new Date(blockTime).toISOString();
            // v('isoBlockTime', isoBlockTime)
            console.log('Fixing missed block', missingBlockNum);
            await (0, checkForLatestBlock_1.handleBlockTxs)(missingBlockNum, blockTxs, isoBlockTime);
            // We can just do one at a time
            break;
        }
    }
};
exports.checkForMissedBlocks = checkForMissedBlocks;
const getAllRPCClients = async () => {
    for (let i = 0; i < variables_1.thisChain.apis.rpc.length; i++) {
        const address = variables_1.thisChain.apis.rpc[i].address;
        try {
            const client = await tendermint_rpc_1.Tendermint34Client.connect(address);
            if (variables_1.allRPCClients.length < variables_1.RPC_LIMIT) {
                variables_1.allRPCClients.push(client);
            }
            else {
                break;
            }
        }
        catch (e) {
            // Sometimes, chain-registry will have an outdated endpoint, carry on
            console.warn('Looks like chain-registry has an issue with this RPC', {
                rpc: address,
                error: e
            });
        }
    }
    // oh yeah, I did not finish having the connections crawl along the list from chain-registry
    (0, variables_1.setTmClient)(await tendermint_rpc_1.Tendermint34Client.connect(variables_1.rpcAddress));
    console.log('setting up wasm extension here');
    (0, variables_1.setTmClientQuery)(stargate_1.QueryClient.withExtensions(variables_1.tmClient, cosmwasm_stargate_1.setupWasmExtension));
};
exports.getAllRPCClients = getAllRPCClients;
const bigIntMe = (theNotBigIntYet) => {
    return BigInt.asUintN(128, theNotBigIntYet);
};
exports.bigIntMe = bigIntMe;
// Quite a useful function to send a query message to a contract at a given block height
const queryContractAtHeight = async (address, args, height) => {
    // Turn JSON object into a string, then into buffer of bytes
    const queryReadableBytes = Buffer.from(JSON.stringify(args));
    const queryBase64 = (0, exports.base64FromBytes)(queryReadableBytes);
    const requestContractData = Uint8Array.from(query_1.QuerySmartContractStateRequest.encode({
        address,
        queryData: queryBase64
    }).finish());
    const queryRespEncoded = await variables_1.tmClientQuery.queryUnverified(`/cosmwasm.wasm.v1.Query/SmartContractState`, requestContractData, height);
    const queryResponseDecoded = query_1.QuerySmartContractStateResponse.decode(queryRespEncoded);
    const queryResponseBase64DecodedData = (0, exports.base64FromBytes)(queryResponseDecoded.data);
    // TODO: atob seems to be deprecated, let's update it
    const queryResponseRawJson = atob(queryResponseBase64DecodedData);
    const queryResponseJson = JSON.parse(queryResponseRawJson);
    return queryResponseJson;
};
exports.queryContractAtHeight = queryContractAtHeight;
