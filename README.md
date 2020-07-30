# akropolisOS

[![Build Status](https://travis-ci.org/akropolisio/akropolisOS.svg?branch=develop)](https://travis-ci.org/akropolisio/akropolisOS) [![Coverage Status](https://coveralls.io/repos/github/akropolisio/akropolisOS/badge.svg?branch=develop)](https://coveralls.io/github/akropolisio/akropolisOS?branch=develop)

AkropolisOS is A Solidity framework for building complex dApps and protocols (savings, pensions, loans, investments).

Akropolis Pool is undercollaterized credit pool based on AkropolisOS, where members of which can earn high-interest rates by providing undercollateralized loans to other members and by pooling and investing capital through various liquid DeFi instruments.

Description of Akropolis Pool can be found in our [wiki](https://wiki.akropolis.io/pool/).

# Testnet (Rinkeby) deployment

## External contracts

### Tokens

- DAI: `0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa`
- USDC: `0x4DBCdF9B62e891a7cec5A2568C3F4FAF9E8Abe2b`
- USDT: `0xD9BA894E0097f8cC2BBc9D24D308b98e36dc6D02` (This deployment uses 18 decimals! USDT on mainnet uses 6)

### Protocols

- cDAI: `0x6D7F0754FFeb405d23C51CE938289d4835bE3b14`
- RAY Storage: `0x21091e9DACac70A9E511a26CE538Ad27Ddb92AcD`
- CurveFi Y Deposit: `0x31191Ad863e842C212A40CFaa47D8108Ad35C8B2`

## Pool contracts

- Pool: `0x3428B9bB254E0625e2EC290C05b06E907034DD5c`
- AccessModule: `0x5BC84B4C30625362eD9a02A86C48544b94074f4B`
- PToken: `0x9F5cf465c7Bf7c520f3bC02b17D4cba4AcDBa12f`
- Defi Module (APYBalancedDefiModule): `0xC471da2c5299353fEc383c44F528e78E70d96599`
- FundsModule: `0xC2Cd74A141Ba6696a1Ef1A7713dD3c2A08836703`
- CurveModule: `0x6617EdC6A3BF12B67b57EDc4dd66cd5Cf0Da7D66`
- LiquidityModule: `0x6e50C7883831b028530f90bdFAF0F00b2c60519f`
- LoanLimitsModule: `0xb0B88ebe92b4C872F4043978D52b77b28Af1b4D4`
- LoanProposalsModule: `0x9171C80Df1c383E0666742690A460BCFA5Ae6173`
- LoanModule: `0xf51c8D7BC1B06584D24094b4136390e0dC4378c6`
- CurveFiYProtocol: `0x8F75c2F4936aCf7934ff16A9301A274a2fB526a6`
- RAYProtocol_DAI: `0xB629B8e5bC09844eDD16E11e6f2a097672032ddE`

## Developer tools

- [Openzeppelin SDK](https://openzeppelin.com/sdk/)
- [Openzepplin Contracts](https://openzeppelin.com/contracts/)
- [Truffle](https://www.trufflesuite.com/)

## Diagrams

### Modules

![Modules](/docs/diagram_modules.jpg)

### User Interactions

![User Interactions](/docs/diagram_user_interactions.jpg)

## Deployment

### Required data:

- Address of liquidity token (`LToken.address`)
- Address of cDAI contract (`cDAI.address`)

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

- `lAmount`: Deposit amount, DAI

#### Required conditions:

- All contracts are deployed

#### Workflow:

1. Call `FundsModule.calculatePoolEnter(lAmount)` to determine expected PTK amount (`pAmount`)
1. Determine minimum acceptable amount of PTK `pAmountMin <= pAmount`, which user expects to get when deposit `lAmount` of DAI. Zero value is allowed.
1. Call `LToken.approve(FundsModule.address, lAmount)` to allow exchange
1. Call `LiquidityModule.deposit(lAmount, pAmountMin)` to execute exchange

### Withdraw

#### Required data:

- `pAmount`: Withdraw amount, PTK

#### Required conditions:

- Available liquidity `LToken.balanceOf(FundsModule.address)` is greater than expected amount of DAI
- User has enough PTK: `PToken.balanceOf(userAddress) >= pAmount`

#### Workflow:

1. Call `FundsModule.calculatePoolExitInverse(pAmount)` to determine expected amount of DAI (`lAmount`). The response has 3 values, use the second one.
1. Determine minimum acceptable amount `lAmountMin <= lAmount` of DAI , which user expects to get when deposit `pAmount` of PTK. Zero value is allowed.
1. Call `PToken.approve(FundsModule.address, pAmount)` to allow exchange
1. Call `LiquidityModule.withdraw(pAmount, lAmountMin)` to execute exchange

## Credits

### Create Loan Request

#### Required data:

- `debtLAmount`: Loan amount, DAI
- `interest`: Interest rate, percents
- `pAmountMax`: Maximal amount of PTK to use as borrower's own pledge
- `descriptionHash`: Hash of loan description stored in Swarm

#### Required conditions:

- User has enough PTK: `PToken.balanceOf(userAddress) >= pAmount`

#### Workflow:

1. Call `FundsModule.calculatePoolExitInverse(pAmount)` to determine expected pledge in DAI (`lAmount`). The response has 3 values, use the first one.
1. Determine minimum acceptable amount `lAmountMin <= lAmount` of DAI, which user expects to lock as a pledge, sending `pAmount` of PTK. Zero value is allowed.
1. Call `PToken.approve(FundsModule.address, pAmount)` to allow operation.
1. Call `LoanModule.createDebtProposal(debtLAmount, interest, pAmountMax, descriptionHash)` to create loan proposal.

#### Data required for future calls:

- Proposal index: `proposalIndex` from event `DebtProposalCreated`.

### Add Pledge

#### Required data:

- Loan proposal identifiers:
  - `borrower` Address of borrower
  - `proposal` Proposal index
- `pAmount` Pledge amount, PTK

#### Required conditions:

- Loan proposal created
- Loan proposal not yet executed
- Loan proposal is not yet fully filled: `LoanModule.getRequiredPledge(borrower, proposal) > 0`
- User has enough PTK: `PToken.balanceOf(userAddress) >= pAmount`

#### Workflow:

1. Call `FundsModule.calculatePoolExitInverse(pAmount)` to determine expected pledge in DAI (`lAmount`). The response has 3 values, use the first one.
1. Determine minimum acceptable amount `lAmountMin <= lAmount` of DAI, which user expects to lock as a pledge, sending `pAmount` of PTK. Zero value is allowed.
1. Call `PToken.approve(FundsModule.address, pAmount)` to allow operation.
1. Call `LoanModule.addPledge(borrower, proposal, pAmount, lAmountMin)` to execute operation.

### Withdraw Pledge

#### Required data:

- Loan proposal identifiers:
  - `borrower` Address of borrower
  - `proposal` Proposal index
- `pAmount` Amount to withdraw, PTK

#### Required conditions:

- Loan proposal created
- Loan proposal not yet executed
- User pledge amount >= `pAmount`

#### Workflow:

1. Call `LoanModule.withdrawPledge(borrower, proposal, pAmount)` to execute operation.

### Loan issuance

#### Required data:

`proposal` Proposal index

#### Required conditions:

- Loan proposal created, user (transaction sender) is the `borrower`
- Loan proposal not yet executed
- Loan proposal is fully funded: `LoanModule.getRequiredPledge(borrower, proposal) == 0`
- Pool has enough liquidity

#### Workflow:

1. Call `LoanModule.executeDebtProposal(proposal)` to execute operation.

#### Data required for future calls:

- Loan index: `debtIdx` from event `DebtProposalExecuted`.

### Loan repayment (partial or full)

#### Required data:

- `debt` Loan index
- `lAmount` Repayable amount, DAI

#### Required conditions:

- User (transaction sender) is the borrower
- Loan is not yet fully repaid

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

## Multi-token support

![Multi-token support](/docs/diagram_multitoken_support.jpg)

## Rinkeby

DAI 0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa

cDAI 0x6D7F0754FFeb405d23C51CE938289d4835bE3b14

yDAI 0xC9e4713C332E07FdC821a6738dd9fc906153eFD6

USDC 0x4DBCdF9B62e891a7cec5A2568C3F4FAF9E8Abe2b

cUSDC 0x5B281A6DdA0B271e91ae35DE655Ad301C976edb1

yUSDC 0x232dA19534032CBfE838e5f620C495D52061e947

USDT 0xD9BA894E0097f8cC2BBc9D24D308b98e36dc6D02

cUSDT 0x2fB298BDbeF468638AD6653FF8376575ea41e768

yUSDT 0x6C0b17593c0cc5BbC71fF955deF41fcad0b05C11

TUSD 0x4529508f5b241ddb430d2e74f6a65082392bff94

yTUSD 0x528ab8394774f0187878f22261952423941d4cda

sUSD 0x15129620e32336438B396ce3825BcDc8Cef4B8eB

renBTC 0xE09fac962aA9BCf5c21B1987396c8A7C16C82B11

wBTC 0xEBa449b9150F34396D529643263A90D495Ae563c

sBTC 0x4Bd89B14F55A6Ef852A938Ccc0181F39E87E80C5

Curve.fi yDAI/yUSDC/yUSDT/yTUSD
Token 0x3524a75b4d0381383c08cda7f1d2180123619aae
Pool 0xD31057E1b9912EaaF559c65bc325b99A1dd55E84
Deposit 0xd5d09c8f2323854a6e6c7548cc6042852f53dcf2

Curve.fi DAI/USDC/USDT/sUSD
Pool 0x26BB094246F77cdD577E7487b40420ceC8C196Ad
Deposit 0x8D9A752E2fCdd51b42BA2d5374302Ce50C3E5950

Curve.fi renBTC/wBTC
Pool 0x5222D3682a2D22c9c8f1101F018C8DE4D5813b03
Deposit 0x70F724b346C748E18A801fe08487005d1F0da532

Curve.fi renBTC/wBTC/sBTC
Pool 0xE99d453aef5E3De4591463b054be990a34363D6E
Deposit 0x885cA7cef7160399b9D59155c6c34db4089b0c12
