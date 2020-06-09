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
call npx oz create AccessModule --network rinkeby --init "initialize(address _pool)" --args 0x113462A2c643dFEb47E9Cc3938FCBab04a058dF9
call npx oz create PToken --network rinkeby --init "initialize(address _pool)" --args 0x113462A2c643dFEb47E9Cc3938FCBab04a058dF9
call npx oz create CurveModule --network rinkeby --init "initialize(address _pool)" --args 0x113462A2c643dFEb47E9Cc3938FCBab04a058dF9
call npx oz create FundsModule --network rinkeby --init "initialize(address _pool)" --args 0x113462A2c643dFEb47E9Cc3938FCBab04a058dF9
call npx oz create LiquidityModule --network rinkeby --init "initialize(address _pool)" --args 0x113462A2c643dFEb47E9Cc3938FCBab04a058dF9
call npx oz create LoanLimitsModule --network rinkeby --init "initialize(address _pool)" --args 0x113462A2c643dFEb47E9Cc3938FCBab04a058dF9
call npx oz create LoanProposalsModule --network rinkeby --init "initialize(address _pool)" --args 0x113462A2c643dFEb47E9Cc3938FCBab04a058dF9
call npx oz create LoanModule --network rinkeby --init "initialize(address _pool)" --args 0x113462A2c643dFEb47E9Cc3938FCBab04a058dF9
goto :done

:setupPoolExternalContracts
echo SETUP POOL: EXTERNAL CONTRACTS
call npx oz send-tx --to 0x113462A2c643dFEb47E9Cc3938FCBab04a058dF9 --network rinkeby --method set --args "ltoken, 0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea, false"
goto :done

:setupPool
echo SETUP POOL: MODULES
call npx oz send-tx --to 0x113462A2c643dFEb47E9Cc3938FCBab04a058dF9 --network rinkeby --method set --args "access, 0x10522512CEb1fd8B1bf077ECb590Eee85856484f, false"
call npx oz send-tx --to 0x113462A2c643dFEb47E9Cc3938FCBab04a058dF9 --network rinkeby --method set --args "ptoken, 0x6553789Cb23a656f2CcbC312AeBFC8C3d697dB1b, false"
call npx oz send-tx --to 0x113462A2c643dFEb47E9Cc3938FCBab04a058dF9 --network rinkeby --method set --args "curve, 0xB49c4b7996E36654436F5a8F3C5d97018379971B, false"
call npx oz send-tx --to 0x113462A2c643dFEb47E9Cc3938FCBab04a058dF9 --network rinkeby --method set --args "funds, 0xa157b6A439ae79dC6e6bf2E170bf0DcfcAEB5AdE, false"
call npx oz send-tx --to 0x113462A2c643dFEb47E9Cc3938FCBab04a058dF9 --network rinkeby --method set --args "liquidity, 0xE45dD10Bb723b13Dd6A226718D1A40cad9518C24, false"
call npx oz send-tx --to 0x113462A2c643dFEb47E9Cc3938FCBab04a058dF9 --network rinkeby --method set --args "loan_limits, 0xFAc465D511a68059C9C659926Ee881e8331234E6, false"
call npx oz send-tx --to 0x113462A2c643dFEb47E9Cc3938FCBab04a058dF9 --network rinkeby --method set --args "loan_proposals, 0xC98560141039adb69d6B5F7949b5403FB8CC5B78, false"
call npx oz send-tx --to 0x113462A2c643dFEb47E9Cc3938FCBab04a058dF9 --network rinkeby --method set --args "loan, 0x49Cc5A2d862567D3b6d8566eDB3FDc174aee8c37, false"
goto :done

:setupFunds
echo SETUP FUNDS (addFundsOperator for liquidity, loan and loan_proposals)
call npx oz send-tx --to 0xa157b6A439ae79dC6e6bf2E170bf0DcfcAEB5AdE --network rinkeby --method addFundsOperator --args 0xE45dD10Bb723b13Dd6A226718D1A40cad9518C24
call npx oz send-tx --to 0xa157b6A439ae79dC6e6bf2E170bf0DcfcAEB5AdE --network rinkeby --method addFundsOperator --args 0xC98560141039adb69d6B5F7949b5403FB8CC5B78
call npx oz send-tx --to 0xa157b6A439ae79dC6e6bf2E170bf0DcfcAEB5AdE --network rinkeby --method addFundsOperator --args 0x49Cc5A2d862567D3b6d8566eDB3FDc174aee8c37
echo ADD FUNDS AS PTOKEN MINTER (addMinter)
call npx oz send-tx --to 0x6553789Cb23a656f2CcbC312AeBFC8C3d697dB1b --network rinkeby --method addMinter --args 0xa157b6A439ae79dC6e6bf2E170bf0DcfcAEB5AdE
goto :done

:setupFee
rem call npx oz send-tx --to 0xB49c4b7996E36654436F5a8F3C5d97018379971B --network rinkeby --method setWithdrawFee --args 5
goto :done

:done
echo DONE