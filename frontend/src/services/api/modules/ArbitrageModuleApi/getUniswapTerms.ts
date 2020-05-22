import { Percent, JSBI, TokenAmount, Token, Trade, ChainId, WETH, Pair } from '@uniswap/sdk';
import { abi as IUniswapV2PairABI } from '@uniswap/v2-core/build/IUniswapV2Pair.json';
import Contract from 'web3/eth/contract';
import Web3 from 'web3';

import { ETH_NETWORK_CONFIG } from 'env';
import { UniswapV2Terms, UniswapV2SwapExactTokensForTokensArgs } from 'model/types';

import { GetTermsFunctionArgs } from './types';

const DAI = new Token(
  ETH_NETWORK_CONFIG.id,
  ETH_NETWORK_CONFIG.contracts.dai,
  18,
  'DAI',
  'Dai Stablecoin',
);

const USDC = new Token(ChainId.MAINNET, ETH_NETWORK_CONFIG.contracts.usdc, 6, 'USDC', 'USD//C');

export async function getUniswapTerms({
  amountIn,
  tokenFrom,
  tokenTo,
  additionalSlippage,
  web3,
  executorAddress,
}: GetTermsFunctionArgs): Promise<UniswapV2Terms | null> {
  const trade = await getTradeExactIn(
    new TokenAmount(new Token(ChainId.MAINNET, tokenFrom, 18), amountIn),
    new Token(ChainId.MAINNET, tokenTo, 18),
    web3,
  );

  if (!trade) {
    return null;
  }

  const slippageAdjustedAmounts = computeSlippageAdjustedAmounts(trade, additionalSlippage);

  const DEFAULT_DEADLINE = 15 * 60;
  const deadlineFromNow: number = Math.ceil(Date.now() / 1000) + DEFAULT_DEADLINE;

  const args: UniswapV2SwapExactTokensForTokensArgs = [
    slippageAdjustedAmounts.input.raw.toString(),
    slippageAdjustedAmounts.output.raw.toString(),
    trade.route.path.map(t => t.address),
    executorAddress,
    deadlineFromNow,
  ];

  return {
    args,
    tokenFrom,
    tokenTo,
    type: 'uniswap-v2',
    amountIn,
    minAmountOut: slippageAdjustedAmounts.output.raw.toString(),
    expectedSlippage: trade.slippage.toFixed(),
  };
}

/**
 * Returns the best trade for the exact amount of tokens in to the given token out
 */
async function getTradeExactIn(
  amountIn: TokenAmount,
  tokenOut: Token,
  web3: Web3,
): Promise<Trade | null> {
  const inputToken = amountIn.token;
  const outputToken = tokenOut;
  const allowedPairs = await getAllCommonPairs(inputToken, outputToken, web3);
  if (allowedPairs.length > 0) {
    return Trade.bestTradeExactIn(allowedPairs, amountIn, tokenOut)[0] ?? null;
  }
  return null;
}

async function getAllCommonPairs(tokenA: Token, tokenB: Token, web3: Web3): Promise<Pair[]> {
  const chainId = ChainId.MAINNET;

  const [pairBetween, aToETH, bToETH, aToDAI, bToDAI, aToUSDC, bToUSDC] = await Promise.all([
    // check for direct pair between tokens
    getPair(tokenA, tokenB, web3),

    // get token<->WETH pairs
    getPair(tokenA, WETH[chainId], web3),
    getPair(tokenB, WETH[chainId], web3),

    // get token<->DAI pairs
    getPair(tokenA, chainId === ChainId.MAINNET ? DAI : null, web3),
    getPair(tokenB, chainId === ChainId.MAINNET ? DAI : null, web3),

    // get token<->USDC pairs
    getPair(tokenA, chainId === ChainId.MAINNET ? USDC : null, web3),
    getPair(tokenB, chainId === ChainId.MAINNET ? USDC : null, web3),
  ]);

  return [pairBetween, aToETH, bToETH, aToDAI, bToDAI, aToUSDC, bToUSDC].filter(
    (p): p is Pair => !!p,
  );
}

/*
 * if loading, return undefined
 * if no pair created yet, return null
 * if pair already created (even if 0 reserves), return pair
 */
async function getPair(tokenA: Token, tokenB: Token | null, web3: Web3): Promise<Pair | null> {
  const pairAddress =
    !!tokenA && !!tokenB && !tokenA.equals(tokenB) ? Pair.getAddress(tokenA, tokenB) : null;
  if (!pairAddress) {
    return null;
  }
  const contract = pairAddress && getContract(pairAddress, IUniswapV2PairABI, web3);
  return tokenB && contract ? getReserves(contract, tokenA, tokenB) : null;
}

function getContract(address: string, ABI: any, web3: Web3): Contract {
  return new web3.eth.Contract(ABI, address);
}

async function getReserves(contract: Contract, tokenA: Token, tokenB: Token): Promise<Pair | null> {
  return contract.methods
    .getReserves()
    .call()
    .then(
      ({
        reserve0,
        reserve1,
      }: {
        reserve0: {
          toString: () => string;
        };
        reserve1: {
          toString: () => string;
        };
      }) => {
        const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA];
        return new Pair(
          new TokenAmount(token0, reserve0.toString()),
          new TokenAmount(token1, reserve1.toString()),
        );
      },
    )
    .catch(() => {
      return null;
    });
}

// converts a basis points value to a sdk percent
function basisPointsToPercent(num: number): Percent {
  return new Percent(JSBI.BigInt(num), JSBI.BigInt(10000));
}

// computes the minimum amount out and maximum amount in for a trade given a user specified allowed slippage in bips
function computeSlippageAdjustedAmounts(trade: Trade, allowedSlippage: number) {
  const pct = basisPointsToPercent(allowedSlippage);
  return {
    input: trade.maximumAmountIn(pct),
    output: trade.minimumAmountOut(pct),
  };
}
