import {TIMEOUT, updateStateTimerId} from "./variables";
import {saveAgentDetails} from "./entities/agents/agents";
import {saveTaskDetails} from "./entities/tasks/tasks";
import {saveConfigDetails} from "./entities/config/config";

export const checkRowsToUpdate = async () => {
    // The main entities in CronCat are agents, tasks, and the contract's configuration
    try {
        await Promise.all([
            saveAgentDetails(),
            saveTaskDetails(),
            saveConfigDetails(),
        ])
    } catch (e) {
        console.error('Failed to save entities', e)
    }

    // This line basically says, "do this all again after waiting a bit"
    // because we love our gracious RPC providers and want to reduce hammering them, even if it's a little
    // Uses this tactic: https://javascript.info/settimeout-setinterval#nested-settimeout
    updateStateTimerId(setTimeout(checkRowsToUpdate, TIMEOUT))
}
