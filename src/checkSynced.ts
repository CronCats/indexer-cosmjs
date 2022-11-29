import {db} from "./variables";
import {v} from "./utils";

export const checkSynced = async () => {
    const notSynced = await db('js_contract_block_piv').select('id').whereNull('state_synced');
    v('Not synced', notSynced)
    for (const { id } of notSynced) {
        try {
            const inAgents = await db('js_agents').where('fk_cb_id', id);
            const inTasks = await db('js_tasks').where('fk_cb_id', id);
            const inConfig = await db('js_config').where('fk_cb_id', id);
            if (!agentNotSynced(inAgents) && !taskNotSynced(inTasks) && !configNotSynced(inConfig)) {
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

// Check if agent hasn't been synced
const agentNotSynced = (agents) => {
    if (agents.length == 0)   {
        return true
    } else {
        const agent = agents[0];
        return (agent.address == null || agent.is_active == null || agent.register_start == null)
    }
}

// Check if task hasn't been synced
const taskNotSynced = (tasks) => {
    if (tasks.length == 0)   {
        return true
    } else {
        const task = tasks[0];
        return (task.hash == null || task.owner == null || task.interval_type == null 
            || task.stop_on_fail == null)
    }
}

// Check if config hasn't been synced
const configNotSynced = (configs) => {
    if (configs.length == 0)   {
        return true
    } else {
        const config = configs[0];
        return (config.paused == null || config.owner_id == null || config.min_tasks_per_agent == null 
            || config.agent_fee == null || config.native_denom == null)
    }
}
