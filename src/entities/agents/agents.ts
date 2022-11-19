// agents table

import {db, settings} from "../../variables";
import {queryContractAtHeight, v} from "../../utils";
import {saveAgentInfo} from "./agentDetails";

export const saveAgentDetails = async () => {
    const neededBlocks = await db('agents').select('blocks.height', 'contract_block_piv.id')
        .rightJoin('contract_block_piv', 'contract_block_piv.id', 'agents.fk_cb_id')
        .innerJoin('blocks', 'contract_block_piv.fk_block_id', 'blocks.id')
        .whereNull('agents.id')
    v('neededBlocks (agents)', neededBlocks)
    let promises = []
    const queryAgentIdsReadableMsg = {
        "get_agent_ids": {} // This means, "call the query function get_agent_ids with no parameters"
    }
    for (const blockInfo of neededBlocks) {
        const contractBlockIdFk = blockInfo.id
        const blockHeight = Number.parseInt(blockInfo.height)
        const managerAddress = settings.contracts.manager.address
        const agentsJson = await queryContractAtHeight(managerAddress, queryAgentIdsReadableMsg, blockHeight)

        v('agentsJson', agentsJson)
        agentsJson.active.map(async activeAgent => {
            const activeId = await db('agents')
                .insert({
                    fk_cb_id: contractBlockIdFk,
                    address: activeAgent,
                    is_active: true,
                    total_tasks_executed: agentsJson.total_tasks_executed,
                    last_executed_slot: agentsJson.last_executed_slot,
                    register_start: agentsJson.register_start,
                    payable_account_id: agentsJson.payable_account_id
                }, 'id')
            // To get more detail on balances, we need to do a couple calls
            promises.push(saveAgentInfo(activeAgent, activeId[0].id, blockInfo))
        })
        agentsJson.pending.map(async pendingAgent => {
            const pendingId = await db('agents')
                .insert({
                    fk_cb_id: contractBlockIdFk,
                    address: pendingAgent,
                    is_active: false,
                }, 'id')
            promises.push(saveAgentInfo(pendingAgent, pendingId[0].id, blockInfo))
        })
    }

    await Promise.all(promises)
}
