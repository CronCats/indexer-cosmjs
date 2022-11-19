import {Coin} from "cosmjs-types/cosmos/base/v1beta1/coin";
import {Tendermint34Client} from "@cosmjs/tendermint-rpc";
import {QueryClient} from "@cosmjs/stargate";
import {WasmExtension} from "@cosmjs/cosmwasm-stargate";

// Modified version from cosmjs-types
// https://github.com/confio/cosmjs-types/blob/2f5736e5a32093a04c9c0926fc8891b2483d23a8/src/cosmwasm/wasm/v1/tx.ts#L63-L75
export interface MsgExecuteContractReadable {
    /** Sender is the that actor that signed the messages */
    sender: string;
    /** Contract is the address of the smart contract */
    contract: string;
    /** Msg json encoded message to be passed to the contract */
    msg: any; // This is modified to be readable
    /** Funds coins that are transferred to the contract on execution */
    funds: Coin[];
}

export interface SimpleTx {
    hash: string,
    memo: string,
    msgs: MsgExecuteContractReadable[]
}

export interface RpcConnection {
    client: Tendermint34Client,
    queryClient: QueryClient & WasmExtension
}

export interface Chain {
    address: string;
    provider?: string;
    archive?: boolean;
}
