import {fromHex} from "@cosmjs/encoding";
import {db, tmClient} from "./variables";
import {v} from "./utils";

export const addTxDetail = async () => {
    const rowsNeedingUpdate = await db('transactions').select('hash', 'id').where('is_complete', false).limit(6)
    // v('Transaction rows needing updating', rowsNeedingUpdate)
    for (const { id, hash } of rowsNeedingUpdate) {
        let txAncillaryInfo
        const txHash = Buffer.from(fromHex(hash))
        try {
            txAncillaryInfo = await tmClient.tx({
                hash: txHash
            })
            await db('transactions').where('id', id)
                .update({
                    code: txAncillaryInfo.result.code,
                    log: txAncillaryInfo.result.log,
                    gas_wanted: txAncillaryInfo.result.gasWanted,
                    gas_used: txAncillaryInfo.result.gasUsed,
                    is_complete: true
                })
        } catch (error) {
            console.error('Issue updating tx info', error)
            // TODO: we can add logtail or other services perhaps later
            // await logtail.error('Could not find and store tx', {
            //     hash,
            //     error,
            //     tmClient,
            // })
        }
    }
}
