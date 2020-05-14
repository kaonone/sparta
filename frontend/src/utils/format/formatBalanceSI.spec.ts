import BN from 'bn.js';

import { formatBalanceSI } from './formatBalanceSI';

describe('formatBalanceSI', (): void => {
  const TESTVAL = new BN('123456789000');

  it('formats empty to 0', (): void => {
    expect(
      formatBalanceSI({
        amountInBaseUnits: '0',
        baseDecimals: 0,
        tokenSymbol: 'Unit',
      }),
    ).toEqual('0');
  });

  it('formats 123,456,789,000 (decimals=15)', (): void => {
    expect(
      formatBalanceSI({
        amountInBaseUnits: TESTVAL,
        baseDecimals: 15,
        tokenSymbol: 'Unit',
      }),
    ).toEqual('123.456µ Unit');
  });

  it('formats 123,456,789,000 (decimals=36)', (): void => {
    expect(
      formatBalanceSI({
        amountInBaseUnits: TESTVAL,
        baseDecimals: 36,
        tokenSymbol: 'Unit',
      }),
    ).toEqual('0.123y Unit');
  });

  it('formats 123,456,789,000 (decimals=12)', (): void => {
    expect(
      formatBalanceSI({
        amountInBaseUnits: TESTVAL,
        baseDecimals: 12,
        tokenSymbol: 'Unit',
      }),
    ).toEqual('123.456m Unit');
  });

  it('formats 123,456,789,000 (decimals=9)', (): void => {
    expect(
      formatBalanceSI({
        amountInBaseUnits: TESTVAL,
        baseDecimals: 9,
        tokenSymbol: 'Unit',
      }),
    ).toEqual('123.456 Unit');
  });

  it('formats 123,456,789,000 (decimals=6)', (): void => {
    expect(
      formatBalanceSI({
        amountInBaseUnits: TESTVAL,
        baseDecimals: 6,
        tokenSymbol: 'Unit',
      }),
    ).toEqual('123.456k Unit');
  });

  it('formats 123,456,789,000 * 10 (decimals=12)', (): void => {
    expect(
      formatBalanceSI({
        amountInBaseUnits: TESTVAL.muln(10),
        baseDecimals: 12,
        tokenSymbol: 'Unit',
      }),
    ).toEqual('1.234 Unit');
  });

  it('formats 123,456,789,000 * 100 (decimals=12)', (): void => {
    expect(
      formatBalanceSI({
        amountInBaseUnits: TESTVAL.muln(100),
        baseDecimals: 12,
        tokenSymbol: 'Unit',
      }),
    ).toEqual('12.345 Unit');
  });

  it('formats 123,456,789,000 * 1000 (decimals=12)', (): void => {
    expect(
      formatBalanceSI({
        amountInBaseUnits: TESTVAL.muln(1000),
        baseDecimals: 12,
        tokenSymbol: 'Unit',
      }),
    ).toEqual('123.456 Unit');
  });

  it('formats -123,456,789,000 (decimals=15)', (): void => {
    expect(
      formatBalanceSI({
        amountInBaseUnits: new BN('-123456789000'),
        baseDecimals: 15,
        tokenSymbol: 'Unit',
      }),
    ).toEqual('-123.456µ Unit');
  });

  it('returns options for dropdown', (): void => {
    expect(formatBalanceSI.getOptions(0)).toEqual([
      { power: 0, value: '-', text: 'Unit' },
      { power: 3, value: 'k', text: 'Kilo' },
      { power: 6, value: 'M', text: 'Mega' },
      { power: 9, value: 'G', text: 'Giga' },
      { power: 12, value: 'T', text: 'Tera' },
      { power: 15, value: 'P', text: 'Peta' },
      { power: 18, value: 'E', text: 'Exa' },
      { power: 21, value: 'Z', text: 'Zeta' },
      { power: 24, value: 'Y', text: 'Yotta' },
    ]);
  });

  it('returns options with custom name of base unit', (): void => {
    expect(formatBalanceSI.getOptions(0, 'CustomName')).toEqual([
      { power: 0, value: '-', text: 'CustomName' },
      { power: 3, value: 'k', text: 'Kilo' },
      { power: 6, value: 'M', text: 'Mega' },
      { power: 9, value: 'G', text: 'Giga' },
      { power: 12, value: 'T', text: 'Tera' },
      { power: 15, value: 'P', text: 'Peta' },
      { power: 18, value: 'E', text: 'Exa' },
      { power: 21, value: 'Z', text: 'Zeta' },
      { power: 24, value: 'Y', text: 'Yotta' },
    ]);
  });
});
