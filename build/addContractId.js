"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addContractId = void 0;
const variables_1 = require("./variables");
const utils_1 = require("./utils");
const addContractId = async () => {
    const rowsNeedingUpdate = await (0, variables_1.db)('js_messages').select('contract', 'id').whereNull('fk_contract_id');
    (0, utils_1.v)('Message rows needing updating', rowsNeedingUpdate);
    for (const { id, contract } of rowsNeedingUpdate) {
        try {
            const contractIdVec = await (0, variables_1.db)('js_contracts').select('id').where("address", contract);
            await (0, variables_1.db)('js_messages').where('id', id)
                .update({
                fk_contract_id: contractIdVec[0].id,
            });
        }
        catch (error) {
            console.error('Issue updating fk_contract_id in messages', error);
        }
    }
};
exports.addContractId = addContractId;
