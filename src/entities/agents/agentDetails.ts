// agents (extra detail)
// agent_balances table

import {queryContractAtHeight, queryUnverified, v} from "../../utils";
import {db, settings} from "../../variables";
import {QueryAllBalancesRequest, QueryAllBalancesResponse} from "cosmjs-types/cosmos/bank/v1beta1/query";

export const saveAgentInfo = async (agentAddress, rowId, blockInfo) => {
    const blockHeight = Number.parseInt(blockInfo.height)
    // Query the smart contract for agent details at a specific height
    const queryGetAgentReadableMsg = {
        get_agent: { // method in smart contract
            account_id: agentAddress // named params
        }
    }
    const managerAddress = settings.contracts.manager.address
    const agentInfo = await queryContractAtHeight(managerAddress, queryGetAgentReadableMsg, blockHeight)
    // v('agent info', agentInfo)

    let promises = []
    promises.push(
        db('agents').update({
            payable_account_id: agentInfo.payable_account_id,
            total_tasks_executed: agentInfo.total_tasks_executed,
            last_executed_slot: agentInfo.last_executed_slot,
            // Nanoseconds are too granular, divide by 10^6
            register_start: new Date(agentInfo.register_start / 1_000_000).toISOString()
        }).where('id', rowId)
    )

    // Add manager contract state to DB
    // 1/2 Native balances
    for (const nativeBalance of agentInfo.balance.native) {
        promises.push(
            db('agent_balances').insert({
                fk_agent_id: rowId,
                type: 'manager-state',
                denom: nativeBalance.denom,
                amount: nativeBalance.amount
            })
        )
    }
    // 2/2 cw20's (as stored in state for the contract)
    for (const contractBalance of agentInfo.balance.cw20) {
        promises.push(
            db('agent_balances').insert({
                fk_agent_id: rowId,
                type: 'manager-state',
                address: contractBalance.address,
                amount: contractBalance.amount
            })
        )
    }

    await Promise.all(promises)
    // Reset promises
    promises = []

    // Get token balances from protocol at a given height
    const requestProtocolData = Uint8Array.from(
        QueryAllBalancesRequest.encode(
            { address: agentAddress }
        ).finish(),
    );
    const protocolBalancesEncoded = await queryUnverified('/cosmos.bank.v1beta1.Query/AllBalances', requestProtocolData, Number.parseInt(blockInfo.height));
    const protocolBalances: QueryAllBalancesResponse = QueryAllBalancesResponse.decode(protocolBalancesEncoded);

    // We're assuming there is no pagination :/. come fix it friend?
    for (const balance of protocolBalances.balances) {
        promises.push(
            db('agent_balances').insert({
                fk_agent_id: rowId,
                type: 'protocol',
                denom: balance.denom,
                amount: balance.amount
            })
        )
    }
    await Promise.all(promises)
}
