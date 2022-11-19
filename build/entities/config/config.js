"use strict";
// config table
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveConfigDetails = void 0;
const variables_1 = require("../../variables");
const utils_1 = require("../../utils");
const configBalances_1 = require("./configBalances");
const saveConfigDetails = async () => {
    const neededBlocks = await (0, variables_1.db)('config').select('blocks.height', 'contract_block_piv.id')
        .rightJoin('contract_block_piv', 'contract_block_piv.id', 'config.fk_cb_id')
        .innerJoin('blocks', 'contract_block_piv.fk_block_id', 'blocks.id')
        .whereNull('config.id');
    (0, utils_1.v)('neededBlocks (config)', neededBlocks);
    let promises = [];
    const getConfigMsg = {
        // get_config function takes no parameters, hence {} being an empty object where you'd normally put params
        get_config: {}
    };
    const managerAddress = variables_1.settings.contracts.manager.address;
    for (const blockInfo of neededBlocks) {
        const blockHeight = Number.parseInt(blockInfo.height);
        const contractBlockIdFk = blockInfo.id;
        promises.push(saveConfig(managerAddress, getConfigMsg, blockHeight, contractBlockIdFk));
    }
    await Promise.all(promises);
};
exports.saveConfigDetails = saveConfigDetails;
const saveConfig = async (contractAddress, getConfigMsg, blockHeight, contractBlockIdFk) => {
    const config = await (0, utils_1.queryContractAtHeight)(contractAddress, getConfigMsg, blockHeight);
    (0, utils_1.v)('config', config);
    // Insert row into config
    const configFkId = await (0, variables_1.db)('config').insert({
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
    }, 'id');
    await (0, configBalances_1.saveConfigBalances)(configFkId[0].id, config);
};
