// config table

import {db, settings} from "../../variables";
import {queryContractAtHeight} from "../../utils";
import {saveConfigBalances} from "./configBalances";

export const saveConfigDetails = async () => {
    const neededBlocks = await db('config').select('blocks.height', 'contract_block_piv.id')
        .rightJoin('contract_block_piv', 'contract_block_piv.id', 'config.fk_cb_id')
        .innerJoin('blocks', 'contract_block_piv.fk_block_id', 'blocks.id')
        .whereNull('config.id')
    // v('neededBlocks (config)', neededBlocks)
    let promises = []
    const getConfigMsg = {
        // get_config function takes no parameters, hence {} being an empty object where you'd normally put params
        get_config: {}
    }
    const managerAddress = settings.contracts.manager.address
    for (const blockInfo of neededBlocks) {
        const blockHeight = Number.parseInt(blockInfo.height)
        const contractBlockIdFk = blockInfo.id

        promises.push(saveConfig(managerAddress, getConfigMsg, blockHeight, contractBlockIdFk))
    }

    await Promise.all(promises)
}

const saveConfig = async (contractAddress, getConfigMsg, blockHeight, contractBlockIdFk) => {
    const config = await queryContractAtHeight(contractAddress, getConfigMsg, blockHeight)
    // v('config', config)
    // Insert row into config
    const configFkId = await db('config').insert({
        fk_cb_id: contractBlockIdFk,
        paused: config.paused,
        owner_id: config.owner_id,
        min_tasks_per_agent: config.min_tasks_per_agent,
        agent_fee: config.agent_fee,
        gas_fraction_numerator: config.gas_fraction.numerator,
        gas_fraction_denominator: config.gas_fraction.denominator,
        gas_base_fee: config.gas_base_fee,
        gas_action_fee: config.gas_action_fee,
        proxy_callback_gas: config.proxy_callback_gas,
        native_denom: config.native_denom
    }, 'id')

    await saveConfigBalances(configFkId[0].id, config)
}
