"use strict";
// agents (extra detail)
// agent_balances table
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveAgentInfo = void 0;
const utils_1 = require("../../utils");
const variables_1 = require("../../variables");
const query_1 = require("cosmjs-types/cosmos/bank/v1beta1/query");
const saveAgentInfo = async (agentAddress, rowId, blockInfo) => {
    const blockHeight = Number.parseInt(blockInfo.height);
    // Query the smart contract for agent details at a specific height
    const queryGetAgentReadableMsg = {
        get_agent: {
            account_id: agentAddress // named params
        }
    };
    const managerAddress = variables_1.settings.contracts.manager.address;
    const agentInfo = await (0, utils_1.queryContractAtHeight)(managerAddress, queryGetAgentReadableMsg, blockHeight);
    (0, utils_1.v)('agent info', agentInfo);
    let promises = [];
    promises.push((0, variables_1.db)('js_agents').update({
        payable_account_id: agentInfo.payable_account_id,
        total_tasks_executed: agentInfo.total_tasks_executed,
        last_executed_slot: agentInfo.last_executed_slot,
        // Nanoseconds are too granular, divide by 10^6
        register_start: new Date(agentInfo.register_start / 1000000).toISOString()
    }).where('id', rowId));
    // Add manager contract state to DB
    // 1/2 Native balances
    for (const nativeBalance of agentInfo.balance.native) {
        promises.push((0, variables_1.db)('js_agent_balances').insert({
            fk_agent_id: rowId,
            type: 'manager-state',
            denom: nativeBalance.denom,
            amount: nativeBalance.amount
        }));
    }
    // 2/2 cw20's (as stored in state for the contract)
    for (const contractBalance of agentInfo.balance.cw20) {
        promises.push((0, variables_1.db)('js_agent_balances').insert({
            fk_agent_id: rowId,
            type: 'manager-state',
            address: contractBalance.address,
            amount: contractBalance.amount
        }));
    }
    try {
        await Promise.all(promises);
    }
    catch (e) {
        console.error('Error doing agent object insertions', e);
    }
    // Reset promises
    promises = [];
    // Get token balances from protocol at a given height
    const requestProtocolData = Uint8Array.from(query_1.QueryAllBalancesRequest.encode({ address: agentAddress }).finish());
    const protocolBalancesEncoded = await (0, utils_1.queryUnverified)('/cosmos.bank.v1beta1.Query/AllBalances', requestProtocolData, Number.parseInt(blockInfo.height));
    const protocolBalances = query_1.QueryAllBalancesResponse.decode(protocolBalancesEncoded);
    // We're assuming there is no pagination :/. come fix it friend?
    for (const balance of protocolBalances.balances) {
        promises.push((0, variables_1.db)('js_agent_balances').insert({
            fk_agent_id: rowId,
            type: 'protocol',
            denom: balance.denom,
            amount: balance.amount
        }));
    }
    try {
        await Promise.all(promises);
    }
    catch (e) {
        console.error('Error doing agent balance insertions', e);
    }
};
exports.saveAgentInfo = saveAgentInfo;
