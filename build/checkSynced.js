"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSynced = void 0;
const variables_1 = require("./variables");
const utils_1 = require("./utils");
const checkSynced = async () => {
    const notSynced = await (0, variables_1.db)('js_contract_block_piv').select('id').whereNull('state_synced');
    (0, utils_1.v)('Not synced', notSynced);
    for (const { id } of notSynced) {
        try {
            const inAgents = await (0, variables_1.db)('js_agents').where('fk_cb_id', id).count('fk_cb_id', id);
            const inTasks = await (0, variables_1.db)('js_tasks').where('fk_cb_id', id).count('fk_cb_id', id);
            const inConfig = await (0, variables_1.db)('js_config').where('fk_cb_id', id).count('fk_cb_id', id);
            if (inAgents[0].count != '0' && inTasks[0].count != '0' && inConfig[0].count != '0') {
                await (0, variables_1.db)('js_contract_block_piv').where('id', id)
                    .update({
                    state_synced: true,
                });
            }
        }
        catch (error) {
            console.error('Issue updating state_synced in js_contract_block_piv', error);
        }
    }
};
exports.checkSynced = checkSynced;
