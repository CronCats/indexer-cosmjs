"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addTxDetail = void 0;
const encoding_1 = require("@cosmjs/encoding");
const variables_1 = require("./variables");
const addTxDetail = async () => {
    const rowsNeedingUpdate = await (0, variables_1.db)('transactions').select('hash', 'id').where('is_complete', false).limit(6);
    // v('Transaction rows needing updating', rowsNeedingUpdate)
    for (const { id, hash } of rowsNeedingUpdate) {
        let txAncillaryInfo;
        const txHash = Buffer.from((0, encoding_1.fromHex)(hash));
        try {
            txAncillaryInfo = await variables_1.tmClient.tx({
                hash: txHash
            });
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
            // TODO: we can add logtail or other services perhaps later
            // await logtail.error('Could not find and store tx', {
            //     hash,
            //     error,
            //     tmClient,
            // })
        }
    }
};
exports.addTxDetail = addTxDetail;
