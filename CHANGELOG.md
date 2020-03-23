# Changelog

## 2020-03-18
* `LoanModule.getUnpaidInterest()` added to calcualte all interest on all loans of a borrower
* `LiquidityModule.withdraw()` now repays all interest on all loans before withdrawing requested amount

## 2020-02-17
* `FundsModule.pBalanceOf` now only represents PTK locked in proposals. PTK locked in executed loans are now counted as `FundsModule.pBalanceOf(FundsModule.address)`. This means, that borrower and supporters will not (at this version) receive distributions to 
* Borrower now pays gas fee for "moving" locked funds of supporters to the pool, which includes calculations of distributions

## 2020-02-15
* Added `FundsModule.pBalanceOf` to get all user's PTK locked in FundsModule
* `PToken` now implements `DistributionToken` to allow distributions of new PTK to all PTK holders

## 2020-02-13
* `BondingCurve` parameters are now changable
* Pool fee calculation moved from `BondingCurve` to `CurveModule`. Use new function `CurveModule.calculateExitInverseWithFee` instead of `BondingCurve.calculateExitInverse`.
* `LoanModule` now calculates `lProposals`: how many DAI is going to be withdrawn from pool for loans
* Changed `FundsModule.Status` event: added `lProposals`
* `FundsModule` now uses `lProposals` to calculate exit price
* Debt load limit added to `LoanModule`