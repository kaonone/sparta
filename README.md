# akropolisOS

[![Build Status](https://travis-ci.org/akropolisio/akropolisOS.svg?branch=develop)](https://travis-ci.org/akropolisio/akropolisOS) [![Coverage Status](https://coveralls.io/repos/github/akropolisio/akropolisOS/badge.svg?branch=develop)](https://coveralls.io/github/akropolisio/akropolisOS?branch=develop)

AkropolisOS - Ethereum implementation (active development)
AkropolisOS is a DAO framework where members of which can earn high-interest rates by providing undercollateralized loans to other members and by pooling and investing capital through various liquid DeFi instruments.

Description of Akropolis Pool can be found in our [wiki](https://wiki.akropolis.io/pool/).

# Testnet (Rinkeby) deployment 
* DAI: `0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa`
* cDAI: `0x6D7F0754FFeb405d23C51CE938289d4835bE3b14`
* Pool: `0x53DB2A5c8304aEE4cD31A9a10d09022e775F2EAd`
* AccessModule: `0xC69D8057bA2484E4487b3B5E059E67822A6cbAA5`
* PToken: `0x5b6214852c5e4E20EF4079bF73e98584FdB65228`
* CompoundModule: `0xCB77413Ab83b6B40Dbf9111e9035adbE92a23282`
* DefiFundsModule: `0x91fcbbD3fE3DFCEa1E96fBa2936a06291a4e3953`
* CurveModule: `0xaF3e4Cb1122b64FCa73354ec421d0c53AA183c88`
* LiquidityModule: `0xA8155d44CaDee6b765E6054bbd39b5A3EBD0BC39`
* LoanLimitsModule: `0x873d123a008C305F58DfFe776626E37c4687ed9f`
* LoanProposalsModule: `0x26c4F1A353d2463b30280686b65fE29ca33eD003`
* LoanModule: `0x8C599627713C6E6A56fB875994aF0ba2E115C74B`

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

### Deployment sequence:
1. Initialize OpenZeppelin project & add modules
    1. `npx oz init`
    1. `npx oz add Pool AccessModule PToken CompoundModule DefiFundsModule CurveModule LiquidityModule LoanLimitsModule LoanProposalsModule LoanModule`
1. Deploy & initialize Pool
    1. `npx oz create Pool --network rinkeby --init`
    1. Save address of the pool (`Pool.address`)
1. Deploy modules
    1. `npx oz create AccessModule --network rinkeby --init "initialize(address _pool)" --args Pool.address`
    1. `npx oz create PToken --network rinkeby --init "initialize(address _pool)" --args Pool.address`
    1. `npx oz create CompoundModule --network rinkeby --init "initialize(address _pool)" --args Pool.address`
    1. `npx oz create CurveModule --network rinkeby --init "initialize(address _pool)" --args Pool.address`
    1. `npx oz create DefiFundsModule --network rinkeby --init "initialize(address _pool)" --args Pool.address`
    1. `npx oz create LiquidityModule --network rinkeby --init "initialize(address _pool)" --args Pool.address`
    1. `npx oz create LoanLimitsModule --network rinkeby --init "initialize(address _pool)" --args Pool.address`
    1. `npx oz create LoanProposalsModule --network rinkeby --init "initialize(address _pool)" --args Pool.address`
    1. `npx oz create LoanModule --network rinkeby --init "initialize(address _pool)" --args Pool.address`
    1. Save address of each module: `AccessModule.address`, `PToken.address`, `CompoundModule.address`, `CurveModule.address`, `DefiFundsModule.address`, `LiquidityModule.address`, `LoanLimitsModule.address`, `LoanProposalsModule.address`, `LoanModule.address`
1. Register external contracts in Pool
    1. `npx oz send-tx --to Pool.address --network rinkeby --method set --args "ltoken, LToken.address, true"`
    1. `npx oz send-tx --to Pool.address --network rinkeby --method set --args "cdai, cDAI.address, true"`
1. Register modules in pool
    1. `npx oz send-tx --to Pool.address --network rinkeby --method set --args "access, AccessModule.address, false"`
    1. `npx oz send-tx --to Pool.address --network rinkeby --method set --args "ptoken, PToken.address, false"`
    1. `npx oz send-tx --to Pool.address --network rinkeby --method set --args "defi, CompoundModule.address, false"`
    1. `npx oz send-tx --to Pool.address --network rinkeby --method set --args "curve, CurveModule.address, false"`
    1. `npx oz send-tx --to Pool.address --network rinkeby --method set --args "funds, DefiFundsModule.address, false"`
    1. `npx oz send-tx --to Pool.address --network rinkeby --method set --args "liquidity, LiquidityModule.address`
    1. `npx oz send-tx --to Pool.address --network rinkeby --method set --args "loan_limits, LoanLimitsModule.address, false`
    1. `npx oz send-tx --to Pool.address --network rinkeby --method set --args "loan_proposals, LoanProposalsModule.address, false"`
    1. `npx oz send-tx --to Pool.address --network rinkeby --method set --args "loan, LoanModule.address, false, false"`
1. Configure modules
    1. `npx oz send-tx --to DefiFundsModule.address --network rinkeby --method addFundsOperator --args LiquidityModule.address`
    1. `npx oz send-tx --to DefiFundsModule.address --network rinkeby --method addFundsOperator --args LoanModule.address`
    1. `npx oz send-tx --to PToken.address --network rinkeby --method addMinter --args DefiFundsModule.address`
    1. `npx oz send-tx --to CompoundModule.address --network rinkeby --method addDefiOperator --args DefiFundsModule.address`

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
