import * as sor from '@balancer-labs/sor';
import { BigNumber } from '@balancer-labs/sor/dist/utils/bignumber';
import { Swap, Pool } from '@balancer-labs/sor/dist/types';
import { calcSpotPrice, bdiv, bmul, bnum } from '@balancer-labs/sor/dist/bmath';

import { BalancerTerms, BalancerBatchSwapExactInArgs, GetTermsFunctionArgs } from './types';

const MAX_UINT256 = bnum(2)
  .pow(256)
  .minus(1);

export async function getBalancerTerms({
  amountIn,
  tokenFrom,
  tokenTo,
  additionalSlippage,
}: GetTermsFunctionArgs): Promise<BalancerTerms | null> {
  const data = await sor.getPoolsWithTokens(tokenFrom, tokenTo);

  const poolData = sor.parsePoolData(data.pools, tokenFrom, tokenTo);

  if (!poolData.length) {
    return null;
  }

  const sorSwaps = sor.smartOrderRouter(poolData, 'swapExactIn', bnum(amountIn), 10, bnum(0));
  const swaps = sor.formatSwapsExactAmountIn(sorSwaps, MAX_UINT256, bnum(0));

  const totalOutput = sor.calcTotalOutput(swaps, poolData);
  const spotOutput = calcTotalSpotValue('exactIn', swaps, poolData);
  const spotPrice = calcPrice(bnum(amountIn), spotOutput);
  const effectivePrice = calcPrice(bnum(amountIn), totalOutput);
  const expectedSlippage = calcExpectedSlippage(spotPrice, effectivePrice);

  const minAmountOut = calcMinAmountOut(
    spotOutput,
    expectedSlippage.plus(bnum(additionalSlippage)),
  );

  const args: BalancerBatchSwapExactInArgs = [
    swaps,
    tokenFrom,
    tokenTo,
    amountIn,
    minAmountOut.toString(),
  ];

  return {
    type: 'balancer',
    tokenFrom,
    tokenTo,
    amountIn,
    minAmountOut: minAmountOut.toString(),
    expectedSlippage: expectedSlippage.toString(),
    args,
  };
}

export const calcPrice = (amountIn: BigNumber, amountOut: BigNumber) => {
  return amountIn.div(amountOut);
};

export const calcExpectedSlippage = (spotPrice: BigNumber, effectivePrice: BigNumber) => {
  const spotPercentage = spotPrice.div(effectivePrice).times(100);

  return bnum(100).minus(spotPercentage);
};

export const calcMinAmountOut = (spotValue: BigNumber, slippagePercent: BigNumber): BigNumber => {
  const result = spotValue.minus(spotValue.times(slippagePercent.div(100))).integerValue(); // TODO - fix this to be fully integer math

  return result.gt(0) ? result : bnum(0);
};

export const calcTotalSpotValue = (
  method: 'exactIn' | 'exactOut',
  swaps: Swap[],
  poolData: Pool[],
) => {
  let totalValue = bnum(0);
  swaps.forEach(swap => {
    const swapAmount = method === 'exactIn' ? swap.tokenInParam : swap.tokenOutParam;
    const pool = poolData.find(p => p.id === swap.pool);
    if (!pool) {
      throw new Error('[Invariant] No pool found for selected balancer index');
    }

    const spotPrice = calcSpotPrice(
      pool.balanceIn,
      pool.weightIn,
      pool.balanceOut,
      pool.weightOut,
      pool.swapFee,
    );

    if (method === 'exactIn') {
      totalValue = totalValue.plus(bdiv(bnum(swapAmount), spotPrice));
    } else if (method === 'exactOut') {
      totalValue = totalValue.plus(bmul(bnum(swapAmount), spotPrice));
    }
  });

  return totalValue;
};
