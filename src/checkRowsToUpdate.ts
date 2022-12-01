import {TIMEOUT, updateStateTimerId, settings} from "./variables";
import {saveAgentDetails} from "./entities/agents/agents";
import {saveTaskDetails} from "./entities/tasks/tasks";
import {saveConfigDetails} from "./entities/config/config";

export const checkRowsToUpdate = async () => {
    // The main entities in the CronCat manager contract are agents, tasks, and the contract's configuration
    // Loop through all the contracts in the environment variable SETTINGS by the category "managers"
    // And run these functions on all of them to gather details about contract state, and some protocol balances

    let promises = []
    for (const { address } of settings.contracts['managers']) {
        promises.push(saveAgentDetails(address))
        promises.push(saveTaskDetails(address))
        promises.push(saveConfigDetails(address))
    }
    // Try running them all
    try {
        await Promise.all(promises)
    } catch (e) {
        console.error('Failed to save entities for managers category', e)
    }
    // Reset it so other contract "categories" (like "managers" from SETTINGS) can be added smoothly
    promises = []

    // Here is where you might another category…
    // For instance:
    // for (const { address } of settings.contracts['my-category']) {

    // This line basically says, "do this all again after waiting a bit"
    // because we love our gracious RPC providers and want to reduce hammering them, even if it's a little
    // Uses this tactic: https://javascript.info/settimeout-setinterval#nested-settimeout
    updateStateTimerId(setTimeout(checkRowsToUpdate, TIMEOUT))
}
