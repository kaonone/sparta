import { roundWei } from './roundWei';

describe('roundWei', (): void => {
  it('rounds empty to 0', (): void => {
    expect(roundWei('', 18, 'ceil', 2).toString()).toEqual('0');
    expect(roundWei('', 18, 'floor', 2).toString()).toEqual('0');
  });

  it('rounds 123,123,123 to 123,120,000 with significant 3 and ceil rounding', (): void => {
    expect(roundWei('123123123', 7, 'ceil', 3).toString()).toEqual('123130000');
  });

  it('rounds 123,123,123 to 123,130,000 with significant 3 and floor rounding', (): void => {
    expect(roundWei('123123123', 7, 'floor', 3).toString()).toEqual('123120000');
  });

  it('rounds 123,123,123 to 123,123,123 if significant more then or eguals decimals', (): void => {
    expect(roundWei('123123123', 5, 'ceil', 5).toString()).toEqual('123123123');
    expect(roundWei('123123123', 5, 'ceil', 5).toString()).toEqual('123123123');
    expect(roundWei('123123123', 5, 'floor', 6).toString()).toEqual('123123123');
    expect(roundWei('123123123', 5, 'floor', 6).toString()).toEqual('123123123');
  });

  it('rounds 123,123,000 to 123,123,000 if rounded value equals initial value', (): void => {
    expect(roundWei('123123000', 6, 'ceil', 3).toString()).toEqual('123123000');
    expect(roundWei('123123000', 6, 'floor', 3).toString()).toEqual('123123000');
  });

  it('rounds 123,123,000 to 0 if (value length) less than or equal (decimals - significant)', (): void => {
    expect(roundWei('123123000', 10, 'floor', 3).toString()).toEqual('120000000');
    expect(roundWei('123123000', 11, 'floor', 3).toString()).toEqual('100000000');
    expect(roundWei('123123000', 12, 'floor', 3).toString()).toEqual('0');
    expect(roundWei('123123000', 13, 'floor', 3).toString()).toEqual('0');
  });

  it('rounds 123,123,000 to 10^decimals if (value length) less than or equal (decimals - significant)', (): void => {
    expect(roundWei('123123000', 10, 'ceil', 3).toString()).toEqual('130000000');
    expect(roundWei('123123000', 11, 'ceil', 3).toString()).toEqual('200000000');
    expect(roundWei('123123000', 12, 'ceil', 3).toString()).toEqual('1000000000');
    expect(roundWei('123123000', 13, 'ceil', 3).toString()).toEqual('10000000000');
  });
});
