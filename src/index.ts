import {checkRowsToUpdate} from "./checkRowsToUpdate";
import {checkForLatestBlock} from "./checkForLatestBlock";
import {addTxDetail} from "./addTxDetail";
import {
  allRPCClients,
  settings,
  TIMEOUT,
  updateStateTimerId
} from "./variables";
import {getAllRPCClients} from "./utils";

// Main entry point
// This is a recursive function based on a recommendation here:
// https://developer.mozilla.org/en-US/docs/Web/API/setInterval#ensure_that_execution_duration_is_shorter_than_interval_frequency
const setup = async () => {
  // Get the latest block (with basic tx info)
  setInterval(() => {
    checkForLatestBlock()
  }, TIMEOUT);

  // Fill out extra transaction detail (gas used vs wanted, etc.)
  setInterval(() => addTxDetail(), TIMEOUT * 2)

  // This setTimeout schedules the next call at the end of the current one.
  updateStateTimerId(setTimeout(checkRowsToUpdate, TIMEOUT * 2));
}

if (settings) {
  getAllRPCClients().then(() => {
    console.log('allRPCClients', allRPCClients)
    setup().then(() => console.log('Beginning…'))
  })
} else {
  console.log('Check the environment variables, please. (Copy .env.template to .env and go from there)')
}
