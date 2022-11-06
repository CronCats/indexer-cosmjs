"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const checkRowsToUpdate_1 = require("./checkRowsToUpdate");
const checkForLatestBlock_1 = require("./checkForLatestBlock");
const addTxDetail_1 = require("./addTxDetail");
const variables_1 = require("./variables");
const utils_1 = require("./utils");
// Main entry point
// This is a recursive function based on a recommendation here:
// https://developer.mozilla.org/en-US/docs/Web/API/setInterval#ensure_that_execution_duration_is_shorter_than_interval_frequency
const setup = async () => {
    // Get the latest block (with basic tx info)
    setInterval(() => {
        (0, checkForLatestBlock_1.checkForLatestBlock)();
    }, variables_1.TIMEOUT);
    // Fill out extra transaction detail (gas used vs wanted, etc.)
    setInterval(() => (0, addTxDetail_1.addTxDetail)(), variables_1.TIMEOUT * 2);
    // This setTimeout schedules the next call at the end of the current one.
    (0, variables_1.updateStateTimerId)(setTimeout(checkRowsToUpdate_1.checkRowsToUpdate, variables_1.TIMEOUT * 2));
};
if (variables_1.settings) {
    (0, utils_1.getAllRPCClients)().then(() => {
        console.log('allRPCClients', variables_1.allRPCClients);
        setup().then(() => console.log('Beginning…'));
    });
}
else {
    console.log('Check the environment variables, please. (Copy .env.template to .env and go from there)');
}
