"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.updateStateTimerId = exports.getStateTimerId = exports.updateLastHeight = exports.lastHeight = exports.updateBlockHeights = exports.blockHeights = exports.contractAddresses = exports.settings = exports.CACHE_LIMIT = exports.RPC_LIMIT = exports.TIMEOUT = exports.setTmClientQuery = exports.tmClientQuery = exports.setTmClient = exports.tmClient = exports.allRPCClients = exports.agents = exports.emptyHeights = exports.blockMap = exports.rpcAddress = exports.thisChain = exports.CHAIN_ID_PREFIX = void 0;
// Contracts we'll want to look for being called
const db_1 = require("./db");
const dotenv_1 = require("dotenv");
const chain_registry_1 = require("chain-registry");
// Set up dotenv for environment variables
(0, dotenv_1.config)({ path: '.env' });
// Use chain registry to get details about this chain, according to what's in .env file
exports.CHAIN_ID_PREFIX = process.env.CHAIN_ID_PREFIX;
exports.thisChain = chain_registry_1.chains.find(({ chain_id }) => chain_id.startsWith(exports.CHAIN_ID_PREFIX));
// Be lazy and get the last one, whatever for now
exports.rpcAddress = exports.thisChain.apis.rpc[exports.thisChain.apis.rpc.length - 1].address;
exports.blockMap = new Map();
exports.emptyHeights = new Set();
exports.agents = new Map();
exports.allRPCClients = [];
const setTmClient = (newClient) => {
    exports.tmClient = newClient;
};
exports.setTmClient = setTmClient;
const setTmClientQuery = (newClient) => {
    exports.tmClientQuery = newClient;
};
exports.setTmClientQuery = setTmClientQuery;
// Set up logging
// TODO: we'll return to logtail and other external logging services
// export const LOGTAIL_TOKEN = process.env.LOGTAIL_TOKEN
// export const logtail = new Logtail(LOGTAIL_TOKEN);
// All other env vars
exports.TIMEOUT = Number.parseInt(process.env.TIMEOUT);
exports.RPC_LIMIT = Number.parseInt(process.env.RPC_LIMIT);
exports.CACHE_LIMIT = Number.parseInt(process.env.CACHE_LIMIT);
exports.settings = JSON.parse(process.env.SETTINGS);
console.log('settings', exports.settings);
exports.contractAddresses = Object.keys(exports.settings.contracts).map(c => exports.settings.contracts[c].address);
console.log('Looking for smart contract calls to these addresses', exports.contractAddresses);
// These are the in-memory cache basically, with a limit
exports.blockHeights = [];
const updateBlockHeights = (newValues) => {
    exports.blockHeights = newValues;
};
exports.updateBlockHeights = updateBlockHeights;
// Keep track of last known height from polling
exports.lastHeight = 0;
const updateLastHeight = (newHeight) => {
    exports.lastHeight = newHeight;
};
exports.updateLastHeight = updateLastHeight;
const updateStateTimerId = (newTimer) => {
    exports.getStateTimerId = newTimer;
};
exports.updateStateTimerId = updateStateTimerId;
exports.db = (0, db_1.getDb)();
