import {db} from "./variables";
import {getTxInfo, v} from "./utils";

export const addTxDetail = async () => {
    const rowsNeedingUpdate = await db('js_transactions').select('hash', 'id').where('is_complete', false).limit(6)
    v('Transaction rows needing updating', rowsNeedingUpdate)
    for (const { id, hash } of rowsNeedingUpdate) {
        let txAncillaryInfo
        try {
            txAncillaryInfo = await getTxInfo(hash)
            await db('js_transactions').where('id', id)
                .update({
                    code: txAncillaryInfo.result.code,
                    log: txAncillaryInfo.result.log,
                    gas_wanted: txAncillaryInfo.result.gasWanted,
                    gas_used: txAncillaryInfo.result.gasUsed,
                    is_complete: true
                })
        } catch (error) {
            console.error('Issue updating tx info', error)
        }
    }
}
