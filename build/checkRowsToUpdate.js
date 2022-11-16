"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRowsToUpdate = void 0;
const variables_1 = require("./variables");
const agents_1 = require("./entities/agents/agents");
const tasks_1 = require("./entities/tasks/tasks");
const config_1 = require("./entities/config/config");
const checkRowsToUpdate = async () => {
    // The main entities in CronCat are agents, tasks, and the contract's configuration
    await Promise.all([
        (0, agents_1.saveAgentDetails)(),
        (0, tasks_1.saveTaskDetails)(),
        (0, config_1.saveConfigDetails)(),
    ]);
    // This line basically says, "do this all again after waiting a bit"
    // because we love our gracious RPC providers and want to reduce hammering them, even if it's a little
    // Uses this tactic: https://javascript.info/settimeout-setinterval#nested-settimeout
    (0, variables_1.updateStateTimerId)(setTimeout(exports.checkRowsToUpdate, variables_1.TIMEOUT));
};
exports.checkRowsToUpdate = checkRowsToUpdate;
