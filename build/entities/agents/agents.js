"use strict";
// agents table
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveAgentDetails = void 0;
const variables_1 = require("../../variables");
const utils_1 = require("../../utils");
const agentDetails_1 = require("./agentDetails");
const saveAgentDetails = async () => {
    const neededBlocks = await (0, variables_1.db)('js_agents').select('js_blocks.height', 'js_contract_block_piv.id')
        .rightJoin('js_contract_block_piv', 'js_contract_block_piv.id', 'js_agents.fk_cb_id')
        .innerJoin('js_blocks', 'js_contract_block_piv.fk_block_id', 'js_blocks.id')
        .whereNull('js_agents.id');
    (0, utils_1.v)('neededBlocks (agents)', neededBlocks);
    let promises = [];
    const queryAgentIdsReadableMsg = {
        "get_agent_ids": {} // This means, "call the query function get_agent_ids with no parameters"
    };
    for (const blockInfo of neededBlocks) {
        const contractBlockIdFk = blockInfo.id;
        const blockHeight = Number.parseInt(blockInfo.height);
        const managerAddress = variables_1.settings.contracts.manager.address;
        const agentsJson = await (0, utils_1.queryContractAtHeight)(managerAddress, queryAgentIdsReadableMsg, blockHeight);
        (0, utils_1.v)('agentsJson', agentsJson);
        agentsJson.active.map(async (activeAgent) => {
            const activeId = await (0, variables_1.db)('js_agents')
                .insert({
                fk_cb_id: contractBlockIdFk,
                address: activeAgent,
                is_active: true,
                total_tasks_executed: agentsJson.total_tasks_executed,
                last_executed_slot: agentsJson.last_executed_slot,
                register_start: agentsJson.register_start,
                payable_account_id: agentsJson.payable_account_id
            }, 'id');
            // To get more detail on balances, we need to do a couple calls
            promises.push((0, agentDetails_1.saveAgentInfo)(activeAgent, activeId[0].id, blockInfo));
        });
        agentsJson.pending.map(async (pendingAgent) => {
            const pendingId = await (0, variables_1.db)('js_agents')
                .insert({
                fk_cb_id: contractBlockIdFk,
                address: pendingAgent,
                is_active: false,
            }, 'id');
            promises.push((0, agentDetails_1.saveAgentInfo)(pendingAgent, pendingId[0].id, blockInfo));
        });
    }
    await Promise.all(promises);
};
exports.saveAgentDetails = saveAgentDetails;
