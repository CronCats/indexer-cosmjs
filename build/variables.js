"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.updateStateTimerId = exports.getStateTimerId = exports.updateLastHeight = exports.lastHeight = exports.updateBlockHeights = exports.blockHeights = exports.contractAddresses = exports.settings = exports.ADD_RPC_ADDRESSES_ALWAYS = exports.ADD_RPC_ADDRESSES = exports.SKIP_RPC_ADDRESSES = exports.VERBOSITY = exports.CHAIN_REGISTRY_URLS = exports.CACHE_LIMIT = exports.RPC_LIMIT = exports.TIMEOUT_CHECK_CHAIN_REGISTRY = exports.TIMEOUT = exports.setAllRPCConnections = exports.allRPCConnections = exports.agents = exports.emptyHeights = exports.blockMap = exports.CHAIN_ID_PREFIX = exports.CHAIN_ID = void 0;
// Contracts we'll want to look for being called
const db_1 = require("./db");
const dotenv_1 = require("dotenv");
// Set up dotenv for environment variables
(0, dotenv_1.config)({ path: '.env' });
// Use chain registry to get details about this chain, according to what's in .env file
exports.CHAIN_ID = process.env.CHAIN_ID;
exports.CHAIN_ID_PREFIX = process.env.CHAIN_ID_PREFIX;
exports.blockMap = new Map();
exports.emptyHeights = new Set();
exports.agents = new Map();
exports.allRPCConnections = [];
const setAllRPCConnections = (newRpcConnections) => {
    exports.allRPCConnections = newRpcConnections;
};
exports.setAllRPCConnections = setAllRPCConnections;
// All other env vars
exports.TIMEOUT = Number.parseInt(process.env.TIMEOUT);
exports.TIMEOUT_CHECK_CHAIN_REGISTRY = Number.parseInt(process.env.TIMEOUT_CHECK_CHAIN_REGISTRY);
exports.RPC_LIMIT = Number.parseInt(process.env.RPC_LIMIT);
exports.CACHE_LIMIT = Number.parseInt(process.env.CACHE_LIMIT);
exports.CHAIN_REGISTRY_URLS = JSON.parse(process.env.CHAIN_REGISTRY_URLS);
exports.VERBOSITY = Number.parseInt(process.env.VERBOSITY) === 1;
exports.SKIP_RPC_ADDRESSES = JSON.parse(process.env.SKIP_RPC_ADDRESSES);
exports.ADD_RPC_ADDRESSES = JSON.parse(process.env.ADD_RPC_ADDRESSES);
exports.ADD_RPC_ADDRESSES_ALWAYS = JSON.parse(process.env.ADD_RPC_ADDRESSES_ALWAYS);
exports.settings = JSON.parse(process.env.SETTINGS);
console.log('settings', exports.settings);
exports.contractAddresses = new Set();
const contractCategories = Object.keys(exports.settings.contracts);
for (const category of contractCategories) {
    for (const contract of exports.settings.contracts[category]) {
        exports.contractAddresses.add(contract.address);
    }
}
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
