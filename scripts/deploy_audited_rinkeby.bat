@echo off
goto :setupFunds

:init
echo INIT PROJECT, ADD CONTRACTS
call npx oz init
call npx oz add Pool AccessModule PToken CurveModule FundsModule LiquidityModule LoanLimitsModule LoanProposalsModule LoanModule 
goto :done

:createPool
echo CREATE POOL
call npx oz create Pool --network rinkeby --init
goto :done

:createModules
echo CREATE MODULES
call npx oz create AccessModule --network rinkeby --init "initialize(address _pool)" --args 0xf25865c1a943230ceca399a45832C36cE6B89BAa
call npx oz create PToken --network rinkeby --init "initialize(address _pool)" --args 0xf25865c1a943230ceca399a45832C36cE6B89BAa
call npx oz create CurveModule --network rinkeby --init "initialize(address _pool)" --args 0xf25865c1a943230ceca399a45832C36cE6B89BAa
call npx oz create FundsModule --network rinkeby --init "initialize(address _pool)" --args 0xf25865c1a943230ceca399a45832C36cE6B89BAa
call npx oz create LiquidityModule --network rinkeby --init "initialize(address _pool)" --args 0xf25865c1a943230ceca399a45832C36cE6B89BAa
call npx oz create LoanLimitsModule --network rinkeby --init "initialize(address _pool)" --args 0xf25865c1a943230ceca399a45832C36cE6B89BAa
call npx oz create LoanProposalsModule --network rinkeby --init "initialize(address _pool)" --args 0xf25865c1a943230ceca399a45832C36cE6B89BAa
call npx oz create LoanModule --network rinkeby --init "initialize(address _pool)" --args 0xf25865c1a943230ceca399a45832C36cE6B89BAa
goto :done

:setupPoolExternalContracts
echo SETUP POOL: EXTERNAL CONTRACTS
call npx oz send-tx --to 0xf25865c1a943230ceca399a45832C36cE6B89BAa --network rinkeby --method set --args "ltoken, 0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea, false"
goto :done

:setupPool
echo SETUP POOL: MODULES
call npx oz send-tx --to 0xf25865c1a943230ceca399a45832C36cE6B89BAa --network rinkeby --method set --args "access, 0xF62B1E7Dbe48873e4FfDd202De501eeb3bBf916c, false"
call npx oz send-tx --to 0xf25865c1a943230ceca399a45832C36cE6B89BAa --network rinkeby --method set --args "ptoken, 0x0C334d18a421857A1dDADb754da4AD115E1c148C, false"
call npx oz send-tx --to 0xf25865c1a943230ceca399a45832C36cE6B89BAa --network rinkeby --method set --args "curve, 0x7e61d2519e774E76632614A9481b9c4F6e86E972, false"
call npx oz send-tx --to 0xf25865c1a943230ceca399a45832C36cE6B89BAa --network rinkeby --method set --args "funds, 0x189665a0d5E3405F112F9a65882C5a164ceB0d63, false"
call npx oz send-tx --to 0xf25865c1a943230ceca399a45832C36cE6B89BAa --network rinkeby --method set --args "liquidity, 0x02134CD73f8E0b914aB171e2639C4f94067E3b38, false"
call npx oz send-tx --to 0xf25865c1a943230ceca399a45832C36cE6B89BAa --network rinkeby --method set --args "loan_limits, 0xB49AF7d992af0985ce0E3074D39600185dc14778, false"
call npx oz send-tx --to 0xf25865c1a943230ceca399a45832C36cE6B89BAa --network rinkeby --method set --args "loan_proposals, 0x73606C46C1dF7B1AC469841b7ce4eD4F5e7232c3, false"
call npx oz send-tx --to 0xf25865c1a943230ceca399a45832C36cE6B89BAa --network rinkeby --method set --args "loan, 0x83014614e8c4Cd564C4DbCB4A6Ef11d056dE7029, false"
goto :done

:setupFunds
echo SETUP FUNDS (addFundsOperator for liquidity, loan and loan_proposals)
call npx oz send-tx --to 0x189665a0d5E3405F112F9a65882C5a164ceB0d63 --network rinkeby --method addFundsOperator --args 0x02134CD73f8E0b914aB171e2639C4f94067E3b38
call npx oz send-tx --to 0x189665a0d5E3405F112F9a65882C5a164ceB0d63 --network rinkeby --method addFundsOperator --args 0x83014614e8c4Cd564C4DbCB4A6Ef11d056dE7029
call npx oz send-tx --to 0x189665a0d5E3405F112F9a65882C5a164ceB0d63 --network rinkeby --method addFundsOperator --args 0x73606C46C1dF7B1AC469841b7ce4eD4F5e7232c3
echo ADD FUNDS AS PTOKEN MINTER (addMinter)
call npx oz send-tx --to 0x0C334d18a421857A1dDADb754da4AD115E1c148C --network rinkeby --method addMinter --args 0x189665a0d5E3405F112F9a65882C5a164ceB0d63
goto :done

:setupFee
rem call npx oz send-tx --to 0x7e61d2519e774E76632614A9481b9c4F6e86E972 --network rinkeby --method setWithdrawFee --args 5
goto :done

:done
echo DONE