import {checkRowsToUpdate} from "./checkRowsToUpdate"
import {checkForLatestBlock} from "./checkForLatestBlock"
import {addTxDetail} from "./addTxDetail"
import {
  allRPCConnections, CHAIN_ID,
  settings,
  updateSettings,
  CHAIN_REGISTRY_URLS,
  TIMEOUT,
  updateStateTimerId, TIMEOUT_CHECK_CHAIN_REGISTRY
} from "./variables"
import {addRPCs, checkForMissedBlocks, factoryContracts, setRPCClients, shuffleRPCs, skipRPCs} from "./utils"
import fetch from 'node-fetch'
import {Chain} from "./interfaces"
import { addContractId } from "./addContractId"
import { checkSynced } from "./checkSynced"
import util from "util";

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
  // Ensure that any extra processing/requests modifying settings are able to update
  await updates()

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

  // Check for synced blocks
  setInterval(() => checkSynced(), TIMEOUT)

  // This setTimeout schedules the next call at the end of the current one.
  // "Call checkRowsToUpdate, let it finish, then wait the timeout amount before calling it again."
  updateStateTimerId(setTimeout(checkRowsToUpdate, TIMEOUT * 2));
}

// This could go in a folder for CronCat-specific stuff to generalize the indexer
const updates = async () => {
  // We provide the CronCat Factory contract address
  // Let's populate the settings variable by discovering the addresses to the other contracts
  const factoryAddress = settings['contracts']['factory'][0].address
  console.log('aloha factoryAddress', factoryAddress)
  const contractsRes = await factoryContracts(factoryAddress)
  console.log('aloha contractsRes', contractsRes)
  for (const contract of contractsRes) {
    settings['contracts'][contract.contract_name] = [{ address: contract.metadata.contract_addr }]
    // console.log('aloha contract', contract)
  }
  // const contractsArr = contractsRes.map(c => {
  //   let o = {}
  //   o[c.contract_name] = {
  //     address: c.metadata.contract_addr
  //   }
  //   return o
  // })
  // console.log('aloha contractsArr', contractsArr)
  // console.log('aloha settingszzz', settings)
  console.log('settingszzz', util.inspect(settings, false, null, true))

}

if (settings) {
  getCurrentRPCs().then(() => {
    console.log('allRPCClients', allRPCConnections)
    setup().then(() => console.log('Alive…'))
  })
} else {
  console.log('Check the environment variables, please. (Copy .env.template to .env and go from there)')
}
