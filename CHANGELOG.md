# Changelog

## 2020-02-13
* `BondingCurve` parameters are now changable
* Pool fee calculation moved from `BondingCurve` to `CurveModule`
* `LoanModule` now calculates `lProposals`: how many DAI is going to be withdrawn from pool for loans
* Changed `FundsModule.Status` event: added `lProposals`
* `FundsModule` now uses `lProposals` to calculate exit price