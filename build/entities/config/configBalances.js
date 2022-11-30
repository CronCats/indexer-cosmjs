"use strict";
// config_balances table
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveConfigBalances = void 0;
const variables_1 = require("../../variables");
const utils_1 = require("../../utils");
const saveConfigBalances = async (configFkId, config) => {
    let promises = [];
    // Save available native balances
    for (const balance of config.available_balance.native) {
        promises.push((0, variables_1.db)('js_config_balances').insert({
            fk_config_id: (0, utils_1.bigIntMe)(configFkId),
            type: 'native',
            denom: balance.denom,
            amount: (0, utils_1.bigIntMe)(balance.amount)
        }));
    }
    // Save available cw20 balances
    for (const balance of config.available_balance.cw20) {
        promises.push((0, variables_1.db)('js_config_balances').insert({
            fk_config_id: (0, utils_1.bigIntMe)(configFkId),
            type: 'cw20',
            address: balance.address,
            amount: (0, utils_1.bigIntMe)(balance.amount)
        }));
    }
    // Save staked native balances
    // dude I'm so lazy
    for (const balance of config.staked_balance.native) {
        promises.push((0, variables_1.db)('js_config_balances').insert({
            fk_config_id: (0, utils_1.bigIntMe)(configFkId),
            type: 'native',
            denom: balance.denom,
            amount: (0, utils_1.bigIntMe)(balance.amount),
            staked: true
        }));
    }
    // lazy but readable amiright
    for (const balance of config.staked_balance.cw20) {
        promises.push((0, variables_1.db)('js_config_balances').insert({
            fk_config_id: (0, utils_1.bigIntMe)(configFkId),
            type: 'cw20',
            address: balance.address,
            amount: (0, utils_1.bigIntMe)(balance.amount),
            staked: true
        }));
    }
    // Do all the insertions
    try {
        await Promise.all(promises);
    }
    catch (e) {
        console.error('Error doing config balance insertions', e);
    }
};
exports.saveConfigBalances = saveConfigBalances;
