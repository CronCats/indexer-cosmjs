"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const checkRowsToUpdate_1 = require("./checkRowsToUpdate");
const checkForLatestBlock_1 = require("./checkForLatestBlock");
const addTxDetail_1 = require("./addTxDetail");
const variables_1 = require("./variables");
const utils_1 = require("./utils");
const node_fetch_1 = __importDefault(require("node-fetch"));
const addContractId_1 = require("./addContractId");
const checkSynced_1 = require("./checkSynced");
// This downloads the latest version from chain-registry 😐
const getCurrentRPCs = async () => {
    let rpcs = [];
    if (Object.keys(variables_1.CHAIN_REGISTRY_URLS).includes(variables_1.CHAIN_ID)) {
        const resp = await (0, node_fetch_1.default)(variables_1.CHAIN_REGISTRY_URLS[variables_1.CHAIN_ID]);
        const jsonResp = await resp.json();
        rpcs = jsonResp['apis'].rpc;
        rpcs = (0, utils_1.skipRPCs)(rpcs);
        rpcs = (0, utils_1.addRPCs)(rpcs);
    }
    else {
        console.error(`Could not find ${variables_1.CHAIN_ID} in the CHAIN_REGISTRY_URLS environment variable. You probably need to update your env vars.`);
    }
    // Randomize order
    rpcs = (0, utils_1.shuffleRPCs)(rpcs);
    await (0, utils_1.setRPCClients)(rpcs);
};
// Main entry point
const setup = async () => {
    // Poll to get the latest block (with basic transaction info but not full details)
    setInterval(() => {
        (0, checkForLatestBlock_1.checkForLatestBlock)();
    }, variables_1.TIMEOUT);
    // Update the chain registry endpoints for the designated chain ID
    setInterval(async () => {
        await getCurrentRPCs();
    }, variables_1.TIMEOUT_CHECK_CHAIN_REGISTRY);
    // Fill out extra transaction detail (gas used vs wanted, etc.)
    setInterval(() => (0, addTxDetail_1.addTxDetail)(), variables_1.TIMEOUT * 2);
    // Check for gaps in blocks
    setInterval(() => (0, utils_1.checkForMissedBlocks)(), variables_1.TIMEOUT * 2);
    // Check for fk_contract_id in messages
    setInterval(() => (0, addContractId_1.addContractId)(), variables_1.TIMEOUT * 2);
    // Check for synced blocks
    setInterval(() => (0, checkSynced_1.checkSynced)(), variables_1.TIMEOUT);
    // This setTimeout schedules the next call at the end of the current one.
    // "Call checkRowsToUpdate, let it finish, then wait the timeout amount before calling it again."
    (0, variables_1.updateStateTimerId)(setTimeout(checkRowsToUpdate_1.checkRowsToUpdate, variables_1.TIMEOUT * 2));
};
if (variables_1.settings) {
    getCurrentRPCs().then(() => {
        console.log('allRPCClients', variables_1.allRPCConnections);
        setup().then(() => console.log('Alive…'));
    });
}
else {
    console.log('Check the environment variables, please. (Copy .env.template to .env and go from there)');
}
