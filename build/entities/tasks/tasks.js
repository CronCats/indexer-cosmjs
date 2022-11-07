"use strict";
// tasks table
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveTaskDetails = void 0;
const variables_1 = require("../../variables");
const utils_1 = require("../../utils");
const saveTaskDetails = async () => {
    const neededBlocks = await (0, variables_1.db)('tasks').select('blocks.height', 'contract_block_piv.id')
        .rightJoin('contract_block_piv', 'contract_block_piv.id', 'tasks.fk_cb_id')
        .innerJoin('blocks', 'contract_block_piv.fk_block_id', 'blocks.id')
        .whereNull('tasks.id');
    // v('neededBlocks (tasks)', neededBlocks)
    let promises = [];
    const getTasksMsg = {
        get_tasks: {
        // TODO: I'm totally leaving no params because I'm horrible. There is pagination to do here.
        }
    };
    const managerAddress = variables_1.settings.contracts.manager.address;
    for (const blockInfo of neededBlocks) {
        const blockHeight = Number.parseInt(blockInfo.height);
        const contractBlockIdFk = blockInfo.id;
        promises.push(saveTasks(managerAddress, getTasksMsg, blockHeight, contractBlockIdFk));
    }
};
exports.saveTaskDetails = saveTaskDetails;
const saveTasks = async (contractAddress, getTasksMsg, blockHeight, contractBlockIdFk) => {
    const tasks = await (0, utils_1.queryContractAtHeight)(contractAddress, getTasksMsg, blockHeight);
    // v('saveTasks tasks', tasks)
    let promises = [];
    for (const task of tasks) {
        promises.push(saveTask(task, contractBlockIdFk));
    }
    await Promise.all(promises);
};
const saveTask = async (task, contractBlockIdFk) => {
    let intervalType;
    // This one is a bit odd since if Block intervals would be a number, but it's fine. Don't see much number comparisons
    // being relevant for this column.
    let intervalValue = null;
    if (typeof task.interval === 'string') {
        // At the time of this writing: this means it's:
        // Immediate or Once
        intervalType = task.interval;
    }
    else {
        // Block or Cron
        intervalType = Object.keys(task.interval)[0];
        intervalValue = task.interval[intervalType].toString();
    }
    (0, utils_1.v)('saveTask task', task);
    let taskToInsert = {
        fk_cb_id: contractBlockIdFk,
        hash: task.task_hash,
        owner: task.owner_id,
        interval_type: intervalType,
        interval_value: intervalValue,
        stop_on_fail: task.stop_on_fail,
    };
    // Add boundary details if applicable
    if (task.boundary) {
        // It's either height-based or time-based
        switch (task.boundary) {
            case 'Height':
                taskToInsert['boundary_height_start'] = 6;
                taskToInsert['boundary_height_end'] = 19;
                break;
            case 'Time':
                taskToInsert['boundary_time_start'] = new Date().toISOString();
                taskToInsert['boundary_time_end'] = new Date().toISOString();
                break;
            default:
                console.warn('Unexpected boundary variant for task', task);
        }
    }
    const taskFkId = await (0, variables_1.db)('tasks').insert(taskToInsert);
    console.log('taskFkId', taskFkId);
};
