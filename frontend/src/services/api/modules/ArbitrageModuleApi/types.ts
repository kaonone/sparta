import Web3 from 'web3';

import { Address, ProtocolTermsGeneric } from 'model/types';

export interface GetTermsFunctionArgs {
  amountIn: string;
  tokenFrom: Address;
  tokenTo: Address;
  tokenFromDecimals: number;
  tokenToDecimals: number;
  additionalSlippage: number;
  executorAddress: string;
  web3: Web3;
}

export type GetTermsFunction = (args: GetTermsFunctionArgs) => Promise<ProtocolTermsGeneric | null>;
