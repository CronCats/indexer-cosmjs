import {db} from "./variables";
import {v} from "./utils";

export const checkSynced = async () => {
    const notSynced = await db('js_contract_block_piv').select('id').whereNull('state_synced');
    v('Not synced', notSynced)
    for (const { id } of notSynced) {
        try {
            const inAgents = await db('js_agents').where('fk_cb_id', id).count('fk_cb_id', id);
            const inTasks = await db('js_tasks').where('fk_cb_id', id).count('fk_cb_id', id);
            const inConfig = await db('js_config').where('fk_cb_id', id).count('fk_cb_id', id);
            if (inAgents[0].count != '0' && inTasks[0].count != '0' && inConfig[0].count != '0') {
                await db('js_contract_block_piv').where('id', id)
                .update({
                    state_synced: true,
                })
            }
        } catch (error) {
            console.error('Issue updating state_synced in js_contract_block_piv', error)
        }
    }
}