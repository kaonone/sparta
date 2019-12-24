# How to work with the Akropolis Pool

## Developer tools
* [Openzeppelin SDK](https://openzeppelin.com/sdk/)
* [Openzepplin Contracts](https://openzeppelin.com/contracts/)
* [Truffle](https://www.trufflesuite.com/)

## Deployment

### Required data:
* Address of liquidity token (`LToken.address`)

### Deployment sequence:
1. PToken
   1. Deploy proxy and contract instance
   1. Call `initialize()`
1. Pool
   1. Deploy proxy and contract instance
   1. Call `initialize`
1. CurveModule
   1. Deploy proxy and contract instance
   1. Call `initialize(Pool.address)`
   1. Register in pool: `Pool.set("curve", CurveModule.address)`
1. FundsModule
   1. Deploy proxy and contract instance
   1. Call `initialize(Pool.address, LToken.address, PToken.address)`
   1. Register in pool: `Pool.set("funds", FundsModule.address)`

## Liquidity

### Deposit
#### Required data:
* `lAmount`: Deposit amount, DAI
#### Required conditions:
* All contracts are deployed
#### Workflow:
1. Call `FundsModule.calculatePoolEnter(lAmount)` to determine expexted PTK amount (`pAmount`)
1. Determine minimum acceptable amount `pAmountMin <= pAmount`, which user expect to get when deposit `lAmount` DAI. Zero value is allowed.
1. Call `LToken.approve(FundsModule.address, lAmount)` to allow exchange
1. Call `FundsModule.deposit(lAmount, pAmountMin)` to execute exchange

### Withdraw
#### Required data:
* `pAmount`: Withdraw amount, PTK
#### Required conditions:
* Available liquidity `LToken.balanceOf(FundsModule.address)` is greater whan expected amount DAI
* User has enough PTK: `PToken.balanceOf(userAddress) >= pAmount`
#### Workflow:
1. Call `FundsModule.calculatePoolExitInverse(pAmount)` to determine expected amount of DAI (`lAmount`). The responce has 3 values, use second one.
1. Determine minimum acceptable amount `lAmountMin <= lAmount`, which user expect to get when deposit `pAmount` PTK. Zero value is allowed.
1. Call `PToken.approve(FundsModule.address, pAmount)` to allow exchange
1. Call `FundsModule.withdraw(pAmount, lAmountMin)` to execute exchange


## Credits
### Create Loan Request
#### Required data:
* `debtLAmount`: Loan amount, DAI
* `interest`: Interest rate, percents
* `pAmount`: Borrower's own pledge, PTK. Should be not less than 50% оf `debtLAmount` when converted to DAI.
#### Required conditions:
* User has enough PTK: `PToken.balanceOf(userAddress) >= pAmount`
#### Workflow:
Вызвать FundsModule.calculatePoolExitInverse(pAmount) для определения ожидаемой суммы залога в DAI (lAmount). В ответе три значения, использовать первое.
Определить минимально-приемлемую сумму lAmountMin <= lAmount, которую пользователь ожидает оставить в качестве залога, отдав pAmount PTK. Можно использовать 0.
Вызвать PToken.approve(FundsModule.address, pAmount) чтобы разрешить обмен
Вызвать FundsModule.createDebtProposal(debtLAmount, interest, pAmount, lAmountMin) чтобы создать заявку.
Данные необходимые для дальнейшей работы:
Индекс заявки: proposalIndex из события DebtProposalCreated .

### Add Pledge
#### Required data:
Идентификаторы заявки на кредит:
Адрес заёмщика borrower
Индекс заявки proposal
Сумма залога в PTK (pAmount)
#### Required conditions:
Создана заявка на кредит
Кредит ещё не выдан
Заявка ещё не полностью заполнена обеспечением: FundsModule.getRequiredPledge(borrower, proposal) > 0
У пользователя имеется достаточно PTK: PToken.balanceOf(userAddress) >= pAmount
#### Workflow:
Вызвать FundsModule.calculatePoolExitInverse(pAmount) для определения ожидаемой суммы DAI (lAmount). В ответе три значения, использовать первое.
Определить минимально-приемлемую сумму lAmountMin <= lAmount, которую пользователь ожидает получить отдав pAmount PTK. Можно использовать 0.
Вызвать PToken.approve(FundsModule.address, pAmount) чтобы разрешить операцию.
Вызвать FundsModule.addPledge(borrower, proposal, pAmount, lAmountMin) чтобы выполнить операцию.

### Withdraw Pledge
#### Required data:
Идентификаторы заявки на кредит:
Адрес заёмщика borrower
Индекс заявки proposal
Возвращаемая сумма залога в PTK (pAmount)
#### Required conditions:
Создана заявка на кредит
Кредит ещё не выдан
Сумма внесенного пользователем залога >= pAmount
#### Workflow:
Вызвать FundsModule.withdrawPledge(borrower, proposal, pAmount) чтобы выполнить операцию

### Loan issuance
#### Required data:
Индекс заявки на кредит proposal
#### Required conditions:
Создана заявка на кредит
Заявка на кредит создана с адреса пользователя (borrower)
Кредит ещё не выдан
Кредит полностью обеспечен: FundsModule.getRequiredPledge(borrower, proposal) == 0
В пуле имеется достаточная ликвидность
#### Workflow:
Вызвать FundsModule.executeDebtProposal(proposal) чтобы выполнить операцию
Данные необходимые для дальнейшей работы:
Индекс займа: debtIdx из события DebtProposalExecuted.

### Loan repayment (partial or full) 
#### Required data:
Индекс займа debt
Возвращаемая сумма в DAI (lAmount)
#### Required conditions:
Займ выдан пользователю (borrower)
Займ ещё не полностью погашен
#### Workflow:
Вызвать LToken.approve(FundsModule.address, lAmount) чтобы разрешить операцию
Вызвать FundsModule.repay(debt, lAmount) чтобы выполнить операцию

