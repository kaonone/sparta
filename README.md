# akropolisOS

[![Build Status](https://travis-ci.org/akropolisio/akropolisOS.svg?branch=develop)](https://travis-ci.org/akropolisio/akropolisOS) [![Coverage Status](https://coveralls.io/repos/github/akropolisio/akropolisOS/badge.svg?branch=develop)](https://coveralls.io/github/akropolisio/akropolisOS?branch=develop)

AkropolisOS - Ethereum implementation (active development)
AkropolisOS is a DAO framework where members of which can earn high-interest rates by providing undercollateralized loans to other members and by pooling and investing capital through various liquid DeFi instruments.

Description of Akropolis Pool can be found in our [wiki](https://wiki.akropolis.io/pool/).

# Testnet (Rinkeby) deployment 
* FreeDAI: `0x3F5B698332572Fb6188492F5D53ba75f81797F9d`
* Pool: `0x3b42805B276eb1b74D253a80962D13ea6982a2ca`
* PToken: `0xC5fC6Ff3fdb34BC4fb8b4cd05184aFFf61dEEDaF`
* CurveModule: `0x02198c667963B03B3180B99521F26D8B12d0C3CB`
* LiquidityModule: `0xF3A7aC40D004Fb545d821DE3e4f823dFfFF766a0`
* LoanModule: `0x94315b5Db360A8b212dB998576Fe0eC3F88d2456`
* FundsModule: `0x83e10F531Df7dd466F6C846bE2e49b1aD95A7ac1`

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
1. LiquidityModule
   1. Deploy proxy and contract instance
   1. Call `initialize(Pool.address)`
   1. Register in pool: `Pool.set("liquidity", LiquidityModule.address)`
1. LoanModule
   1. Deploy proxy and contract instance
   1. Call `initialize(Pool.address)`
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
1. Call `FundsModule.calculatePoolEnter(lAmount)` to determine expeсted PTK amount (`pAmount`)
1. Determine minimum acceptable amount of PTK `pAmountMin <= pAmount`, which user expects to get when deposit `lAmount` of DAI. Zero value is allowed.
1. Call `LToken.approve(FundsModule.address, lAmount)` to allow exchange
1. Call `LiquidityModule.deposit(lAmount, pAmountMin)` to execute exchange

### Withdraw
#### Required data:
* `pAmount`: Withdraw amount, PTK
#### Required conditions:
* Available liquidity `LToken.balanceOf(FundsModule.address)` is greater whan expected amount of DAI
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

