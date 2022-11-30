"use strict";
// tasks table
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveTaskDetails = void 0;
const variables_1 = require("../../variables");
const utils_1 = require("../../utils");
const saveTaskDetails = async () => {
    const neededBlocks = await (0, variables_1.db)('js_tasks').select('js_blocks.height', 'js_contract_block_piv.id')
        .rightJoin('js_contract_block_piv', 'js_contract_block_piv.id', 'js_tasks.fk_cb_id')
        .innerJoin('js_blocks', 'js_contract_block_piv.fk_block_id', 'js_blocks.id')
        .whereNull('js_tasks.id');
    (0, utils_1.v)('neededBlocks (tasks)', neededBlocks);
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
    try {
        await Promise.all(promises);
    }
    catch (e) {
        console.error('fuck me running6', e);
    }
};
exports.saveTaskDetails = saveTaskDetails;
const saveTasks = async (contractAddress, getTasksMsg, blockHeight, contractBlockIdFk) => {
    console.log('aloha10');
    const tasks = await (0, utils_1.queryContractAtHeight)(contractAddress, getTasksMsg, blockHeight);
    let promises = [];
    for (const task of tasks) {
        promises.push(saveTask(task, contractBlockIdFk));
    }
    console.log('aloha6');
    try {
        await Promise.all(promises);
    }
    catch (e) {
        console.error('fuck me running7', e);
    }
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
    (0, utils_1.v)('Saving task…', task);
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
    console.log('aloha8');
    let taskRes;
    try {
        taskRes = await (0, variables_1.db)('js_tasks').insert(taskToInsert, 'id');
    }
    catch (e) {
        console.error('aloha taskRes error', e, taskToInsert);
    }
    const taskFkId = taskRes[0].id;
    // console.log('taskFkId', taskRes)
    let promises = [];
    // Native tokens (amount_for_one_task_native)
    for (const amountForOneNative of task.amount_for_one_task_native) {
        promises.push((0, variables_1.db)('js_task_amount_per').insert({
            fk_task_id: taskFkId,
            type: 'native',
            denom: amountForOneNative.denom,
            amount: amountForOneNative.amount
        }));
    }
    // cw20 tokens (amount_for_one_task_cw20)
    for (const amountForOneCw20 of task.amount_for_one_task_cw20) {
        promises.push((0, variables_1.db)('js_task_amount_per').insert({
            fk_task_id: taskFkId,
            type: 'cw20',
            address: amountForOneCw20.address,
            amount: amountForOneCw20.amount
        }));
    }
    // Total deposits (total_deposit)
    // NOTE: at the time of this writing, it seems like we're just covering native token
    // but the database table task_deposits will be able to have other types
    for (const totalDepositNative of task.total_deposit) {
        promises.push((0, variables_1.db)('js_task_deposits').insert({
            fk_task_id: taskFkId,
            type: 'native',
            denom: totalDepositNative.denom,
            amount: totalDepositNative.amount
        }));
    }
    // Task actions (actions)
    for (const action of task.actions) {
        promises.push((0, variables_1.db)('js_task_actions').insert({
            fk_task_id: taskFkId,
            msg: action.msg,
            gas_limit: action.gas_limit
        }));
    }
    // Task rules (actions)
    for (const rule of task.rules) {
        const ruleVariant = Object.keys(rule.msg)[0];
        promises.push((0, variables_1.db)('js_task_rules').insert({
            fk_task_id: taskFkId,
            rule_variant: ruleVariant,
            data: task[ruleVariant]
        }));
    }
    // Task funds withdrawn (funds_withdrawn_recurring)
    // NOTE: at the time of this writing, it seems we're only tracking native tokens
    for (const fundsWithdrawnNative of task.funds_withdrawn_recurring) {
        promises.push((0, variables_1.db)('js_task_deposits').insert({
            fk_task_id: taskFkId,
            type: 'native',
            denom: fundsWithdrawnNative.denom,
            amount: fundsWithdrawnNative.amount
        }));
    }
    console.log('aloha7');
    try {
        await Promise.all(promises);
    }
    catch (e) {
        console.error('fuck me running8', e);
    }
};
