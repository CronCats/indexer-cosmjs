import {checkRowsToUpdate} from "./checkRowsToUpdate"
import {checkForLatestBlock} from "./checkForLatestBlock"
import {addTxDetail} from "./addTxDetail"
import {
  allRPCConnections, CHAIN_ID,
  settings,
  CHAIN_REGISTRY_URLS,
  TIMEOUT,
  updateStateTimerId, TIMEOUT_CHECK_CHAIN_REGISTRY
} from "./variables"
import {addRPCs, checkForMissedBlocks, setRPCClients, shuffleRPCs, skipRPCs} from "./utils"
import fetch from 'node-fetch'
import {Chain} from "./interfaces"
import { addContractId } from "./addContractId"

// This downloads the latest version from chain-registry 😐
const getCurrentRPCs = async () => {
  let rpcs: Chain[] =[]
  if (Object.keys(CHAIN_REGISTRY_URLS).includes(CHAIN_ID)) {
    const resp = await fetch(CHAIN_REGISTRY_URLS[CHAIN_ID])
    const jsonResp = await resp.json()
    rpcs = jsonResp['apis'].rpc
    rpcs = skipRPCs(rpcs)
    rpcs = addRPCs(rpcs)
  } else {
    console.error(`Could not find ${CHAIN_ID} in the CHAIN_REGISTRY_URLS environment variable. You probably need to update your env vars.`)
  }
  // Randomize order
  rpcs = shuffleRPCs(rpcs)
  await setRPCClients(rpcs)
}

// Main entry point
const setup = async () => {
  // Poll to get the latest block (with basic transaction info but not full details)
  setInterval(() => {
    checkForLatestBlock()
  }, TIMEOUT)

  // Update the chain registry endpoints for the designated chain ID
  setInterval(async () => {
    await getCurrentRPCs()
  }, TIMEOUT_CHECK_CHAIN_REGISTRY)

  // Fill out extra transaction detail (gas used vs wanted, etc.)
  setInterval(() => addTxDetail(), TIMEOUT * 2)

  // Check for gaps in blocks
  setInterval(() => checkForMissedBlocks(), TIMEOUT * 2)

  // Check for fk_contract_id in messages
  setInterval(() => addContractId(), TIMEOUT * 2)

  // This setTimeout schedules the next call at the end of the current one.
  // "Call checkRowsToUpdate, let it finish, then wait the timeout amount before calling it again."
  updateStateTimerId(setTimeout(checkRowsToUpdate, TIMEOUT * 2));
}

if (settings) {
  getCurrentRPCs().then(() => {
    console.log('allRPCClients', allRPCConnections)
    setup().then(() => console.log('Alive…'))
  })
} else {
  console.log('Check the environment variables, please. (Copy .env.template to .env and go from there)')
}
