// Contracts we'll want to look for being called
import {getDb} from "./db";
import {config} from "dotenv";
// import {Logtail} from "@logtail/node";
import {Chain} from "@chain-registry/types";
import {chains} from "chain-registry";
import {Tendermint34Client} from "@cosmjs/tendermint-rpc";
import {QueryClient} from "@cosmjs/stargate";
// Set up dotenv for environment variables
config({ path: '.env' });
// Use chain registry to get details about this chain, according to what's in .env file
export const CHAIN_ID_PREFIX = process.env.CHAIN_ID_PREFIX
export const thisChain: Chain = chains.find(({chain_id}) => chain_id.startsWith(CHAIN_ID_PREFIX));

// Be lazy and get the last one, whatever for now
export const rpcAddress: string = thisChain.apis.rpc[thisChain.apis.rpc.length - 1].address;

export let blockMap = new Map()
export let emptyHeights = new Set()
export let agents = new Map()
export let allRPCClients: Tendermint34Client[] = [];

// Silly "any" workaround cuz later we'd like to assign it to a Tendermint34Client from @cosmjs/stargate
export let tmClient: any;
export const setTmClient = (newClient: any) => {
    tmClient = newClient
}
export let tmClientQuery: any; // another hack
export const setTmClientQuery = (newClient: QueryClient) => {
    tmClientQuery = newClient
}

// Set up logging
// TODO: we'll return to logtail and other external logging services
// export const LOGTAIL_TOKEN = process.env.LOGTAIL_TOKEN
// export const logtail = new Logtail(LOGTAIL_TOKEN);

// All other env vars
export const TIMEOUT: number = Number.parseInt(process.env.TIMEOUT)
export const RPC_LIMIT: number = Number.parseInt(process.env.RPC_LIMIT)
export const CACHE_LIMIT: number = Number.parseInt(process.env.CACHE_LIMIT)

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
