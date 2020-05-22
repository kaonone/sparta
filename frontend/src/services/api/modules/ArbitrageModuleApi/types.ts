import Web3 from 'web3';

import { Address, ProtocolTermsGeneric } from 'model/types';

export interface GetTermsFunctionArgs {
  amountIn: string;
  tokenFrom: Address;
  tokenTo: Address;
  additionalSlippage: number;
  executorAddress: string;
  web3: Web3;
}

export type GetTermsFunction = (args: GetTermsFunctionArgs) => Promise<ProtocolTermsGeneric | null>;
