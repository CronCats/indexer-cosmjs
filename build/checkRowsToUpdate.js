"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRowsToUpdate = void 0;
const variables_1 = require("./variables");
const agents_1 = require("./entities/agents/agents");
const tasks_1 = require("./entities/tasks/tasks");
const config_1 = require("./entities/config/config");
const checkRowsToUpdate = async () => {
    // The main entities in the CronCat manager contract are agents, tasks, and the contract's configuration
    // Loop through all the contracts in the environment variable SETTINGS by the category "managers"
    // And run these functions on all of them to gather details about contract state, and some protocol balances
    let promises = [];
    for (const { address } of variables_1.settings.contracts['managers']) {
        promises.push((0, agents_1.saveAgentDetails)(address));
        promises.push((0, tasks_1.saveTaskDetails)(address));
        promises.push((0, config_1.saveConfigDetails)(address));
    }
    // Try running them all
    try {
        await Promise.all(promises);
    }
    catch (e) {
        console.error('Failed to save entities for managers category', e);
    }
    // Reset it so other contract "categories" (like "managers" from SETTINGS) can be added smoothly
    promises = [];
    // Here is where you might another category…
    // For instance:
    // for (const { address } of settings.contracts['my-category']) {
    // This line basically says, "do this all again after waiting a bit"
    // because we love our gracious RPC providers and want to reduce hammering them, even if it's a little
    // Uses this tactic: https://javascript.info/settimeout-setinterval#nested-settimeout
    (0, variables_1.updateStateTimerId)(setTimeout(exports.checkRowsToUpdate, variables_1.TIMEOUT));
};
exports.checkRowsToUpdate = checkRowsToUpdate;
