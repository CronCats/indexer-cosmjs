"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addTxDetail = void 0;
const variables_1 = require("./variables");
const utils_1 = require("./utils");
const addTxDetail = async () => {
    const rowsNeedingUpdate = await (0, variables_1.db)('transactions').select('hash', 'id').where('is_complete', false).limit(6);
    (0, utils_1.v)('Transaction rows needing updating', rowsNeedingUpdate);
    for (const { id, hash } of rowsNeedingUpdate) {
        let txAncillaryInfo;
        try {
            txAncillaryInfo = await (0, utils_1.getTxInfo)(hash);
            await (0, variables_1.db)('transactions').where('id', id)
                .update({
                code: txAncillaryInfo.result.code,
                log: txAncillaryInfo.result.log,
                gas_wanted: txAncillaryInfo.result.gasWanted,
                gas_used: txAncillaryInfo.result.gasUsed,
                is_complete: true
            });
        }
        catch (error) {
            console.error('Issue updating tx info', error);
        }
    }
};
exports.addTxDetail = addTxDetail;
