// config table

import {db, settings} from "../../variables";
import {queryContractAtHeight, v} from "../../utils";
import {saveConfigBalances} from "./configBalances";

export const saveConfigDetails = async (managerAddress: string) => {
    const neededBlocks = await db('js_config').select('js_blocks.height', 'js_contract_block_piv.id')
        .rightJoin('js_contract_block_piv', 'js_contract_block_piv.id', 'js_config.fk_cb_id')
        .innerJoin('js_blocks', 'js_contract_block_piv.fk_block_id', 'js_blocks.id')
        .whereNull('js_config.id')
    v('neededBlocks (config)', neededBlocks)
    let promises = []
    const getConfigMsg = {
        // get_config function takes no parameters, hence {} being an empty object where you'd normally put params
        get_config: {}
    }
    for (const blockInfo of neededBlocks) {
        const blockHeight = Number.parseInt(blockInfo.height)
        const contractBlockIdFk = blockInfo.id

        promises.push(saveConfig(managerAddress, getConfigMsg, blockHeight, contractBlockIdFk))
    }
    try {
        await Promise.all(promises)
    } catch (e) {
        console.error('Error querying/inserting config', e)
    }
}

const saveConfig = async (contractAddress, getConfigMsg, blockHeight, contractBlockIdFk) => {
    const config = await queryContractAtHeight(contractAddress, getConfigMsg, blockHeight)
    v('config', config)
    // Insert row into config
    const configFkId = await db('js_config').insert({
        fk_cb_id: contractBlockIdFk,
        paused: config.paused,
        owner_id: config.owner_id,
        min_tasks_per_agent: config.min_tasks_per_agent,
        agent_fee: config.agent_fee,
        gas_fraction_numerator: config.gas_price.numerator,
        gas_fraction_denominator: config.gas_price.denominator,
        gas_base_fee: config.gas_base_fee,
        gas_action_fee: config.gas_action_fee,
        proxy_callback_gas: config.proxy_callback_gas,
        native_denom: config.native_denom
    }, 'id')

    await saveConfigBalances(configFkId[0].id, config)
}
