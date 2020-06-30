# akropolisOS

[![Build Status](https://travis-ci.org/akropolisio/akropolisOS.svg?branch=develop)](https://travis-ci.org/akropolisio/akropolisOS) [![Coverage Status](https://coveralls.io/repos/github/akropolisio/akropolisOS/badge.svg?branch=develop)](https://coveralls.io/github/akropolisio/akropolisOS?branch=develop)

AkropolisOS is A Solidity framework for building complex dApps and protocols (savings, pensions, loans, investments).

Akropolis Pool is undercollaterized credit pool based on AkropolisOS,  where members of which can earn high-interest rates by providing undercollateralized loans to other members and by pooling and investing capital through various liquid DeFi instruments.

Description of Akropolis Pool can be found in our [wiki](https://wiki.akropolis.io/pool/).

# Mainnet deployment 
* DAI: `0x6b175474e89094c44da98b954eedeac495271d0f`
* Pool: `0x73067fdd366Cb678E9b539788F4C0f34C5700246`
* AccessModule: `0xfE7B0aeb84D134c5be6b217e51B2b040F5B7cB7B`
* PToken: `0xAA2edc0E5CDE4Da80628972c501e79326741dB17`
* CurveModule: `0xFb6b0103063CDf701b733db3Fa3F1c0686F19668`
* FundsModule: `0xc88F54A79CaE4C125D7A8c2Cf811daaE78b07D64`
* LiquidityModule: `0x543cBc6693f8cBCf0AE5f2cfd9922203cc13b10A` 
* LoanLimitsModule: `0x42b41f636C9eBB150F859f65e3c0f938b0347f59`
* LoanProposalsModule: `0xd3bdEdA5e165E67985a4Dc7927E4651Bedd1950c`
* LoanModule: `0x42E24De51db5baf6E18F91619195375FBAe63b13`

## Developer tools
* [Openzeppelin SDK](https://openzeppelin.com/sdk/)
* [Openzepplin Contracts](https://openzeppelin.com/contracts/)
* [Truffle](https://www.trufflesuite.com/)

## Diagrams
### Modules
![Modules](/docs/diagram_modules.jpg)
### User Interactions
![User Interactions](/docs/diagram_user_interactions.jpg)

## Deployment

### Required data:
* Address of liquidity token (`LToken.address`)

### Deployment sequence:
1. Pool
   1. Deploy proxy and contract instance
   1. Call `initialize()`
1. Liquidity token
   1. Register in pool: `Pool.set("ltoken", LToken.address)`    
1. PToken
   1. Deploy proxy and contract instance
   1. Call `initialize(Pool.address)`
   1. Register in pool: `Pool.set("ptoken", PToken.address)`
1. CurveModule
   1. Deploy proxy and contract instance
   1. Call `initialize(Pool.address)`
   1. Register in pool: `Pool.set("curve", CurveModule.address)`
1. AccessModule
   1. Deploy proxy and contract instance
   1. Call `initialize(Pool.address)`
   1. Register in pool: `Pool.set("access", CurveModule.address)`
1. LiquidityModule
   1. Deploy proxy and contract instance
   1. Call `initialize(Pool.address)`
   1. Register in pool: `Pool.set("liquidity", LiquidityModule.address)`
1. LoanModule, LoanLimitsModule, LoanProposalsModule
   1. Deploy proxy and contract instance of LoanLimitsModule
   1. Call `LoanLimitsModule.initialize(Pool.address)`
   1. Register in pool: `Pool.set("loan_limits", LoanLimitsModule.address)`
   1. Deploy proxy and contract instance of LoanProposalsModule
   1. Call `LoanProposalsModule.initialize(Pool.address)`
   1. Register in pool: `Pool.set("loan_proposals", LoanProposalsModule.address)`
   1. Deploy proxy and contract instance of LoanModule
   1. Call `LoanModule.initialize(Pool.address)`
   1. Register in pool: `Pool.set("loan", LoanModule.address)`
1. FundsModule
   1. Deploy proxy and contract instance
   1. Call `initialize(Pool.address)`
   1. Register in pool: `Pool.set("funds", FundsModule.address)`
   1. Add LiquidityModule as FundsOperator: `FundsModule.addFundsOperator(LiquidityModule.address)`
   1. Add LoanModule as FundsOperator: `FundsModule.addFundsOperator(LoanModule.address)`
   1. Add FundsModule as a Minter for PToken: `PToken.addMinter(FundsModule.address)`

## Liquidity

### Deposit
#### Required data:
* `lAmount`: Deposit amount, DAI
#### Required conditions:
* All contracts are deployed
#### Workflow:
1. Call `FundsModule.calculatePoolEnter(lAmount)` to determine expected PTK amount (`pAmount`)
1. Determine minimum acceptable amount of PTK `pAmountMin <= pAmount`, which user expects to get when deposit `lAmount` of DAI. Zero value is allowed.
1. Call `LToken.approve(FundsModule.address, lAmount)` to allow exchange
1. Call `LiquidityModule.deposit(lAmount, pAmountMin)` to execute exchange

### Withdraw
#### Required data:
* `pAmount`: Withdraw amount, PTK
#### Required conditions:
* Available liquidity `LToken.balanceOf(FundsModule.address)` is greater than expected amount of DAI
* User has enough PTK: `PToken.balanceOf(userAddress) >= pAmount`
#### Workflow:
1. Call `FundsModule.calculatePoolExitInverse(pAmount)` to determine expected amount of DAI (`lAmount`). The response has 3 values, use the second one.
1. Determine minimum acceptable amount `lAmountMin <= lAmount` of DAI , which user expects to get when deposit `pAmount` of PTK. Zero value is allowed.
1. Call `PToken.approve(FundsModule.address, pAmount)` to allow exchange
1. Call `LiquidityModule.withdraw(pAmount, lAmountMin)` to execute exchange


## Credits
### Create Loan Request
#### Required data:
* `debtLAmount`: Loan amount, DAI
* `interest`: Interest rate, percents
* `pAmountMax`: Maximal amount of PTK to use as borrower's own pledge
* `descriptionHash`: Hash of loan description stored in Swarm
#### Required conditions:
* User has enough PTK: `PToken.balanceOf(userAddress) >= pAmount`
#### Workflow:
1. Call `FundsModule.calculatePoolExitInverse(pAmount)` to determine expected pledge in DAI (`lAmount`). The response has 3 values, use the first one.
1. Determine minimum acceptable amount `lAmountMin <= lAmount` of DAI, which user expects to lock as a pledge, sending `pAmount` of PTK. Zero value is allowed.
1. Call `PToken.approve(FundsModule.address, pAmount)` to allow operation.
1. Call `LoanModule.createDebtProposal(debtLAmount, interest, pAmountMax, descriptionHash)` to create loan proposal.
#### Data required for future calls:
* Proposal index: `proposalIndex` from event `DebtProposalCreated`.

### Add Pledge
#### Required data:
* Loan proposal identifiers:
  * `borrower` Address of borrower
  * `proposal` Proposal index
* `pAmount`  Pledge amount, PTK
#### Required conditions:
* Loan proposal created
* Loan proposal not yet executed
* Loan proposal is not yet fully filled: `LoanModule.getRequiredPledge(borrower, proposal) > 0`
* User has enough PTK: `PToken.balanceOf(userAddress) >= pAmount`

#### Workflow:
1. Call `FundsModule.calculatePoolExitInverse(pAmount)` to determine expected pledge in DAI (`lAmount`). The response has 3 values, use the first one.
1. Determine minimum acceptable amount `lAmountMin <= lAmount` of DAI, which user expects to lock as a pledge, sending `pAmount` of PTK. Zero value is allowed.
1. Call `PToken.approve(FundsModule.address, pAmount)` to allow operation.
1. Call `LoanModule.addPledge(borrower, proposal, pAmount, lAmountMin)` to execute operation.

### Withdraw Pledge
#### Required data:
* Loan proposal identifiers:
  * `borrower` Address of borrower
  * `proposal` Proposal index
* `pAmount`  Amount to withdraw, PTK
#### Required conditions:
* Loan proposal created
* Loan proposal not yet executed
* User pledge amount >= `pAmount`
#### Workflow:
1. Call `LoanModule.withdrawPledge(borrower, proposal, pAmount)` to execute operation.

### Loan issuance
#### Required data:
`proposal` Proposal index
#### Required conditions:
* Loan proposal created, user (transaction sender) is the `borrower`
* Loan proposal not yet executed
* Loan proposal is fully funded: `LoanModule.getRequiredPledge(borrower, proposal) == 0`
* Pool has enough liquidity
#### Workflow:
1. Call `LoanModule.executeDebtProposal(proposal)` to execute operation.
#### Data required for future calls:
* Loan index: `debtIdx` from event `DebtProposalExecuted`.

### Loan repayment (partial or full) 
#### Required data:
* `debt` Loan index
* `lAmount` Repayable amount, DAI
#### Required conditions:
* User (transaction sender) is the borrower
* Loan is not yet fully repaid
#### Workflow:
1. Call `LToken.approve(FundsModule.address, lAmount)` to allow operation.
1. Call `LoanModule.repay(debt, lAmount)` to execute operation.

## Distributions
When borrower repays some part of his loan, he uses some PTK (either from his balance or minted when he sends DAI to the pool).
This PTKs are distributed to supporters, proportionally to the part of the loan they covered. The borrower himself also covered half of the loan, and his part is distributed over the whole pool.
All users of the pool receive part of this distributions proportional to the amount of PTK they hold on their balance and in loan proposals, PTK locked as collateral for loans is not counted.
![Distributions](/docs/diagram_distributions.jpg)
### Distribution mechanics
When you need to distribute some amount of tokens over all token holders one's first straight-forward idea might be to iterate through all token holders, check their balance and increase it by their part of the distribution.
Unfortunately, this approach can hardly be used in Ethereum blockchain. All operations in EVM cost some gas. If we have a lot of token holders, gas cost for iteration through all may be higher than a gas limit for transaction (which is currently equal to gas limit for block).
Instead, during distribution we just store amount of PTK to be distributed and current amount of all PTK qualified for distribution. And user balance is only updated by separate request or when it is going to be changed by transfer, mint or burn. During this "lazy" update we go through all distributions occured between previous and current update.
Now, one may ask what if there is too much distributions occurred in the pool between this updated and the gas usage to iterate through all of them is too high again? Obvious solution would be to allow split such transaction to several smaller ones, and we've implemented this approach.
But we also decided to aggregate all distributions during a day. This way we can protect ourself from dust attacks, when somebody may do a lot of small repays which cause a lot of small distributions.
When a distribution request is received by PToken we check if it's time to actually create new distribution. If it's not, we just add distribution amount to the accumulator.
When time comes (and this condition is also checked by transfers, mints and burns), actual distribution is created using accumulated amount of PTK and total supply of qualified PTK.


