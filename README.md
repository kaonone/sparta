# akropolisOS

[![Build Status](https://travis-ci.org/akropolisio/akropolisOS.svg?branch=develop)](https://travis-ci.org/akropolisio/akropolisOS) [![Coverage Status](https://coveralls.io/repos/github/akropolisio/akropolisOS/badge.svg?branch=develop)](https://coveralls.io/github/akropolisio/akropolisOS?branch=develop)

AkropolisOS - Ethereum implementation (active development)
AkropolisOS is a DAO framework where members of which can earn high-interest rates by providing undercollateralized loans to other members and by pooling and investing capital through various liquid DeFi instruments.

Description of Akropolis Pool can be found in our [wiki](https://wiki.akropolis.io/pool/).

# Mainnetdeployment 
## External contracts
* DAI: `0x6b175474e89094c44da98b954eedeac495271d0f`
* cDAI: _not used_
* RAY Storage: `0x446711e5ed3013743e40342a0462fbdc437cd43f`

## Pool contracts
* Pool: `0x3501d2c95F8dB9A94E0f0BCD15E2a440C71ceaE4`
* AccessModule: `0x3f2ced4322ecfd1a77fc972bd6d690cf632ba09c`
* PToken: `0x764112eCFFDdB111f78e9475d70010fD1120257f`
* CurveModule: `0xa6d9d61c6637e8d1ab1f535baabb53e756559cdc`
* CompoundModule: _not deployed_
* RAYModule: `0xEEbaf85E5452F11e33e059ADb3F2F10E748a3562`
* FundsModule: `0x1dEA32aAd5Ef531538CdC7eab515072aBc65d855`
* PensionFundModule: `0x23b1Fb463a87815F6f8714bc4af9Ce8214C4c748`
* FlashLoansModule: `0x7cD7833930E7fb43Fc4F221eBfFE3eFAE39D1442`
* ArbitrageModule: `0x6E2CFb462D04b2385fE5d1D16A6e0A8154fd201e`

# Testnet (Kovan) deployment 

## External contracts
* DAI: `0x4f96fe3b7a6cf9725f59d353f723c1bdb64ca6aa`
* cDAI: `0xe7bc397dbd069fc7d0109c0636d06888bb50668c`
* RAY Storage: _not used_

## Pool contracts
* Pool: `0xBc4C64C8F5838C4A7e10Ac9bB0b606D3AD4c8809`
* AccessModule: `0x790C6cAB44C0ff8311E5F501d36b57B2aD18e9C9`
* PToken: `0xcC64F821A6C32884C0648C12E62585FdBC7bA082`
* CurveModule: `0xBA9d498AA8d650b9ce38D6cE5B0d6539d254A3e8`
* CompoundModule: `0xDc6b5507647137B663fe81C4aBA6912a88eF9F73`
* RAYModule: _not deployed_
* FundsModule: `0x29518F102cC748d30178e1fB6215f2BEF4a85b86`
* PensionFundModule: `0x03843c8a5b7A6c4F563CF5514E53286A7f934ea0`
* FlashLoansModule: `0x310879fEf4e301425336eBC2f58C29bd5127d174`
* ArbitrageModule: `0x220F8d93889fD51528b7b119FF7C9a10149EbCf2`

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
    1. `npx oz create PensionFundModule --network kovan --init "initialize(address _pool)" --args Pool.address`
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
    1. `npx oz send-tx --to Pool.address --network kovan --method set --args "liquidity, PensionFundModule.address`
    1. `npx oz send-tx --to Pool.address --network kovan --method set --args "flashloans, FlashLoansModule.address, false`
    1. `npx oz send-tx --to Pool.address --network kovan --method set --args "arbitrage, ArbitrageModule.address, false"`
1. Configure modules
    1. `npx oz send-tx --to DefiFundsModule.address --network kovan --method addFundsOperator --args PensionFundModule.address`
    1. `npx oz send-tx --to DefiFundsModule.address --network kovan --method addFundsOperator --args FlashLoansModule.address`
    1. `npx oz send-tx --to PToken.address --network kovan --method addMinter --args DefiFundsModule.address`
    1. `npx oz send-tx --to CompoundModule.address --network kovan --method addDefiOperator --args DefiFundsModule.address`
1. Configure fee (optional)
    1. `npx oz send-tx --to CurveModule.address --network kovan --method setWithdrawFee --args 5`
    1. `npx oz send-tx --to FlashLoansModule.address --network kovan --method setFee --args 100000000000000`


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
