import BN from 'bn.js';

import { formatBalance } from './formatBalance';

describe('formatBalance', (): void => {
  const TESTVAL = new BN('123456789000');

  it('formats empty to 0', (): void => {
    expect(
      formatBalance({
        amountInBaseUnits: '0',
        baseDecimals: 0,
        tokenSymbol: 'Unit',
      }),
    ).toEqual('0 Unit');
  });

  it('formats 123,456,789,000 (decimals=15)', (): void => {
    expect(
      formatBalance({
        amountInBaseUnits: TESTVAL,
        baseDecimals: 15,
        tokenSymbol: 'Unit',
      }),
    ).toEqual('0.00 Unit');
  });

  it('formats 123,456,789,000 (decimals=12)', (): void => {
    expect(
      formatBalance({
        amountInBaseUnits: TESTVAL,
        baseDecimals: 12,
        tokenSymbol: 'Unit',
      }),
    ).toEqual('0.12 Unit');
  });

  it('formats 123,456,789,000 (decimals=9)', (): void => {
    expect(
      formatBalance({
        amountInBaseUnits: TESTVAL,
        baseDecimals: 9,
        tokenSymbol: 'Unit',
      }),
    ).toEqual('123.45 Unit');
  });

  it('formats 123,456,789,000 (decimals=6)', (): void => {
    expect(
      formatBalance({
        amountInBaseUnits: TESTVAL,
        baseDecimals: 6,
        tokenSymbol: 'Unit',
      }),
    ).toEqual('123,456.78 Unit');
  });

  it('formats 123,456,789,000 * 10 (decimals=12)', (): void => {
    expect(
      formatBalance({
        amountInBaseUnits: TESTVAL.muln(10),
        baseDecimals: 12,
        tokenSymbol: 'Unit',
      }),
    ).toEqual('1.23 Unit');
  });

  it('formats 123,456,789,000 * 100 (decimals=12)', (): void => {
    expect(
      formatBalance({
        amountInBaseUnits: TESTVAL.muln(100),
        baseDecimals: 12,
        tokenSymbol: 'Unit',
      }),
    ).toEqual('12.34 Unit');
  });

  it('formats 123,456,789,000 * 1000 (decimals=12)', (): void => {
    expect(
      formatBalance({
        amountInBaseUnits: TESTVAL.muln(1000),
        baseDecimals: 12,
        tokenSymbol: 'Unit',
      }),
    ).toEqual('123.45 Unit');
  });

  it('formats -123,456,789,000 (decimals=9)', (): void => {
    expect(
      formatBalance({
        amountInBaseUnits: new BN('-123456789000'),
        baseDecimals: 9,
        tokenSymbol: 'Unit',
      }),
    ).toEqual('-123.45 Unit');
  });

  it('formats 123,456,789,000 without whitespace (decimals=12)', (): void => {
    expect(
      formatBalance({
        amountInBaseUnits: TESTVAL,
        baseDecimals: 12,
      }),
    ).toEqual('0.12');
  });

  it('formats 123,456,789,000 with precision (decimals=12, precision=12)', (): void => {
    expect(
      formatBalance({
        amountInBaseUnits: TESTVAL,
        baseDecimals: 12,
        precision: 12,
      }),
    ).toEqual('0.123456789000');
  });
});
