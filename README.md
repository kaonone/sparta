# akropolisOS

[![Build Status](https://travis-ci.org/akropolisio/akropolisOS.svg?branch=develop)](https://travis-ci.org/akropolisio/akropolisOS) [![Coverage Status](https://coveralls.io/repos/github/akropolisio/akropolisOS/badge.svg?branch=develop)](https://coveralls.io/github/akropolisio/akropolisOS?branch=develop)

AkropolisOS - Ethereum implementation (active development)
AkropolisOS is a DAO framework where members of which can earn high-interest rates by providing undercollateralized loans to other members and by pooling and investing capital through various liquid DeFi instruments.

Description of Akropolis Pool can be found in our [wiki](https://wiki.akropolis.io/pool/).

# Testnet (Kovan) deployment 

## External contracts
* DAI: `0x4f96fe3b7a6cf9725f59d353f723c1bdb64ca6aa`
* cDAI: `0xe7bc397dbd069fc7d0109c0636d06888bb50668c`
* RAY Storage: _not used_

## Pool contracts
* Pool: `0x5bd1242E5F7Ed06a5c883BE54d35d5Cf710a3108`
* AccessModule: `0x63058A669DE8A40E7EB82a8C3dEF1b1d6D46334c`
* PToken: `0xAF36F5B597a9c005E6292c9Cc03E8806Aa3C4dFd`
* CurveModule: `0xEDa2fac3d3fdfeE5dc0dC51A6191a4C8C25dA4a2`
* CompoundModule: `0x48a0598819399Fd1584F279cD55088300e8BA7dD`
* RAYModule: _not deployed_
* FundsModule: `0xf62722CB78C05CD4e435A6a39817aE48087BD311`
* LiquidityModule: `0x028bB345352B38Ac2b2de190dE3f334B17e985E2`
* FlashLoansModule: `0x1bf9c5183cAd17687336E8a7fC56699f0a7786E6`
* ArbitrageModule: `0x99FF63aB210e2A6D743964d8ffFef545A9422376`

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
* Address of cDAI contract (`cDAI.address`)
<!--* Address of RAY Storage contract (`RAYStorage.address`)-->

### Deployment sequence:
1. Initialize OpenZeppelin project & add modules
    1. `npx oz init`
    1. `npx oz add Pool AccessModule PToken CompoundModule DefiFundsModule CurveModule LiquidityModule LoanLimitsModule LoanProposalsModule LoanModule`
1. Deploy & initialize Pool
    1. `npx oz create Pool --network kovan --init`
    1. Save address of the pool (`Pool.address`)
1. Deploy modules
    1. `npx oz create AccessModule --network kovan --init "initialize(address _pool)" --args Pool.address`
    1. `npx oz create PToken --network kovan --init "initialize(address _pool)" --args Pool.address`
    1. `npx oz create CurveModule --network kovan --init "initialize(address _pool)" --args Pool.address`
    1. `npx oz create CompoundModule --network kovan --init "initialize(address _pool)" --args Pool.address`
    <!--1. `npx oz create RAYModule --network kovan --init "initialize(address _pool)" --args Pool.address`-->
    1. `npx oz create DefiFundsModule --network kovan --init "initialize(address _pool)" --args Pool.address`
    1. `npx oz create LiquidityModule --network kovan --init "initialize(address _pool)" --args Pool.address`
    1. `npx oz create FlashLoansModule --network kovan --init "initialize(address _pool)" --args Pool.address`
    1. `npx oz create ArbitrageModule --network kovan --init "initialize(address _pool)" --args Pool.address`
    1. Save address of each module: `AccessModule.address`, `PToken.address`, `CurveModule.address`, `CompoundModule.address`, `DefiFundsModule.address`, `LiquidityModule.address`, `FlashLoansModule.address`, `ArbitrageModule.address`
1. Register external contracts in Pool
    1. `npx oz send-tx --to Pool.address --network kovan --method set --args "ltoken, LToken.address, false"`
    1. `npx oz send-tx --to Pool.address --network kovan --method set --args "cdai, cDAI.address, false"`
    <!--1. `npx oz send-tx --to Pool.address --network kovan --method set --args "ray, RAYStorage.address, false"`-->
1. Register modules in pool
    1. `npx oz send-tx --to Pool.address --network kovan --method set --args "access, AccessModule.address, false"`
    1. `npx oz send-tx --to Pool.address --network kovan --method set --args "ptoken, PToken.address, false"`
    1. `npx oz send-tx --to Pool.address --network kovan --method set --args "defi, CompoundModule.address, false"`
    <!--1. `npx oz send-tx --to Pool.address --network kovan --method set --args "defi, RAYModule.address, false"`-->
    1. `npx oz send-tx --to Pool.address --network kovan --method set --args "curve, CurveModule.address, false"`
    1. `npx oz send-tx --to Pool.address --network kovan --method set --args "funds, DefiFundsModule.address, false"`
    1. `npx oz send-tx --to Pool.address --network kovan --method set --args "liquidity, LiquidityModule.address`
    1. `npx oz send-tx --to Pool.address --network kovan --method set --args "flashloans, FlashLoansModule.address, false`
    1. `npx oz send-tx --to Pool.address --network kovan --method set --args "arbitrage, ArbitrageModule.address, false"`
1. Configure modules
    1. `npx oz send-tx --to DefiFundsModule.address --network kovan --method addFundsOperator --args LiquidityModule.address`
    1. `npx oz send-tx --to DefiFundsModule.address --network kovan --method addFundsOperator --args FlashLoansModule.address`
    1. `npx oz send-tx --to PToken.address --network kovan --method addMinter --args DefiFundsModule.address`
    1. `npx oz send-tx --to CompoundModule.address --network kovan --method addDefiOperator --args DefiFundsModule.address`
1. Configure fee (optional)
    1. `npx oz send-tx --to CurveModule.address --network kovan --method setWithdrawFee --args 5`
    1. `npx oz send-tx --to FlashLoansModule.address --network kovan --method setFee --args 1000000000000000000`


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

## PTK Distributions
When borrower repays some part of his loan, he uses some PTK (either from his balance or minted when he sends DAI to the pool).
This PTKs are distributed to supporters, proportionally to the part of the loan they covered. The borrower himself also covered half of the loan, and his part is distributed over the whole pool.
All users of the pool receive part of this distributions proportional to the amount of PTK they hold on their balance and in loan proposals, PTK locked as collateral for loans is not counted.
![PTK Distributions](/docs/diagram_distributions.jpg)
### Distribution mechanics
When you need to distribute some amount of tokens over all token holders one's first straight-forward idea might be to iterate through all token holders, check their balance and increase it by their part of the distribution.
Unfortunately, this approach can hardly be used in Ethereum blockchain. All operations in EVM cost some gas. If we have a lot of token holders, gas cost for iteration through all may be higher than a gas limit for transaction (which is currently equal to gas limit for block).
Instead, during distribution we just store amount of PTK to be distributed and current amount of all PTK qualified for distribution. And user balance is only updated by separate request or when it is going to be changed by transfer, mint or burn. During this "lazy" update we go through all distributions occured between previous and current update.
Now, one may ask what if there is too much distributions occurred in the pool between this updated and the gas usage to iterate through all of them is too high again? Obvious solution would be to allow split such transaction to several smaller ones, and we've implemented this approach.
But we also decided to aggregate all distributions during a day. This way we can protect ourself from dust attacks, when somebody may do a lot of small repays which cause a lot of small distributions.
When a distribution request is received by PToken we check if it's time to actually create new distribution. If it's not, we just add distribution amount to the accumulator.
When time comes (and this condition is also checked by transfers, mints and burns), actual distribution is created using accumulated amount of PTK and total supply of qualified PTK.

## Defi module distributions
Defi module transfers funds to some underlying protocol, Compound in current version. Exchange rate of DAI to Compound DAI is icreased over time. So while amount of Compound DAI stays same, amount of underlying DAI available is continiously increased.
During distributions Defi module calculates this additional ammount, so that PTK holders can widhraw their share at any time.
![Compound Distributions](/docs/diagram_compound_distributions.jpg)
### Distribution mechanics
Defi module is configured to create distributions once a day. It stores time of next distribution and when time comes, any change of PTK balance or withdraw request will trigger a new distribution.
With this distribution event Defi module stores how many additional DAI it can distribute, current balances of DAI and PTK.
When one decides to withdraw (claim) his share of this additional DAI, Defi module iterates through all unclaimed distributions and calculates user's share of that distribution accroding to user's PTK balance and total amount of PTK at that time.
