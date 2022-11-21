// config_balances table

import {db} from "../../variables";
import {bigIntMe} from "../../utils";

export const saveConfigBalances = async (configFkId, config) => {
    let promises = []
    // Save available native balances
    for (const balance of config.available_balance.native) {
        promises.push(
            db('js_config_balances').insert({
                fk_config_id: bigIntMe(configFkId),
                type: 'native',
                denom: balance.denom,
                amount: bigIntMe(balance.amount)
            })
        )
    }
    // Save available cw20 balances
    for (const balance of config.available_balance.cw20) {
        promises.push(
            db('js_config_balances').insert({
                fk_config_id: bigIntMe(configFkId),
                type: 'cw20',
                address: balance.address,
                amount: bigIntMe(balance.amount)
            })
        )
    }
    // Save staked native balances
    // dude I'm so lazy
    for (const balance of config.staked_balance.native) {
        promises.push(
            db('js_config_balances').insert({
                fk_config_id: bigIntMe(configFkId),
                type: 'native',
                denom: balance.denom,
                amount: bigIntMe(balance.amount),
                staked: true
            })
        )
    }
    // lazy but readable amiright
    for (const balance of config.staked_balance.cw20) {
        promises.push(
            db('js_config_balances').insert({
                fk_config_id: bigIntMe(configFkId),
                type: 'cw20',
                address: balance.address,
                amount: bigIntMe(balance.amount),
                staked: true
            })
        )
    }

    // Do all the insertions
    await Promise.all(promises)
}
