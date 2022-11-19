// Contracts we'll want to look for being called
import {getDb} from "./db"
import {config} from "dotenv"
import {RpcConnection} from "./interfaces"
// Set up dotenv for environment variables
config({ path: '.env' })
// Use chain registry to get details about this chain, according to what's in .env file
export const CHAIN_ID = process.env.CHAIN_ID
export const CHAIN_ID_PREFIX = process.env.CHAIN_ID_PREFIX

export let blockMap = new Map()
export let emptyHeights = new Set()
export let agents = new Map()

export let allRPCConnections: RpcConnection[] = [];
export const setAllRPCConnections = (newRpcConnections) => {
    allRPCConnections = newRpcConnections
}

// All other env vars
export const TIMEOUT: number = Number.parseInt(process.env.TIMEOUT)
export const TIMEOUT_CHECK_CHAIN_REGISTRY: number = Number.parseInt(process.env.TIMEOUT_CHECK_CHAIN_REGISTRY)
export const RPC_LIMIT: number = Number.parseInt(process.env.RPC_LIMIT)
export const CACHE_LIMIT: number = Number.parseInt(process.env.CACHE_LIMIT)
export const CHAIN_REGISTRY_URLS: any[] = JSON.parse(process.env.CHAIN_REGISTRY_URLS)

export let settings = JSON.parse(process.env.SETTINGS)
console.log('settings', settings)
export const contractAddresses = Object.keys(settings.contracts).map(c => settings.contracts[c].address)
console.log('Looking for smart contract calls to these addresses', contractAddresses)

// These are the in-memory cache basically, with a limit
export let blockHeights = []
export const updateBlockHeights = (newValues) => {
    blockHeights = newValues
}

// Keep track of last known height from polling
export let lastHeight: number = 0;
export const updateLastHeight = (newHeight) => {
    lastHeight = newHeight
}

export let getStateTimerId
export const updateStateTimerId = (newTimer) => {
    getStateTimerId = newTimer
}

export const db = getDb()
