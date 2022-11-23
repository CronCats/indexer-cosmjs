import {db} from "./variables";
import {v} from "./utils";

export const addContractId = async () => {
    const rowsNeedingUpdate = await db('js_messages').select('contract', 'id').whereNull('fk_contract_id');
    v('Message rows needing updating', rowsNeedingUpdate)
    for (const { id, contract } of rowsNeedingUpdate) {
        try {
            const contractIdVec = await db('js_contracts').select('id').where("address", contract);
            await db('js_messages').where('id', id)
                .update({
                    fk_contract_id: contractIdVec[0].id,
                })
        } catch (error) {
            console.error('Issue updating fk_contract_id in messages', error)
        }
    }
}
