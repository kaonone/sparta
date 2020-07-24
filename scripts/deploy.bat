@echo off
rem === DEFINES ===

SET NETWORK=rinkeby

SET EXT_TOKEN_DAI=0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa
SET EXT_TOKEN_USDC=0x4DBCdF9B62e891a7cec5A2568C3F4FAF9E8Abe2b
SET EXT_TOKEN_USDT=0xD9BA894E0097f8cC2BBc9D24D308b98e36dc6D02
SET EXT_COMPOUND_CTOKEN_DAI=0x6D7F0754FFeb405d23C51CE938289d4835bE3b14
SET EXT_COMPOUND_CTOKEN_USDC=0x5B281A6DdA0B271e91ae35DE655Ad301C976edb1
SET EXT_COMPOUND_CTOKEN_USDT=0x2fB298BDbeF468638AD6653FF8376575ea41e768
SET EXT_RAY_DAI_STORAGE=0x21091e9DACac70A9E511a26CE538Ad27Ddb92AcD
SET EXT_CURVEFY_Y_DEPOSIT=0x31191Ad863e842C212A40CFaa47D8108Ad35C8B2
SET EXT_TOKEN_DAI_DECIMALS=18
SET EXT_TOKEN_USDC_DECIMALS=6
SET EXT_TOKEN_USDT_DECIMALS=18
SET EXT_TOKEN_DAI_RATE=1000000000000000000
SET EXT_TOKEN_USDC_RATE=1000000000000000000000000000000
SET EXT_TOKEN_USDT_RATE=1000000000000000000

SET MODULE_POOL=0x3428B9bB254E0625e2EC290C05b06E907034DD5c
SET MODULE_ACCESS=0x5BC84B4C30625362eD9a02A86C48544b94074f4B
SET MODULE_PTOKEN=0x9F5cf465c7Bf7c520f3bC02b17D4cba4AcDBa12f
SET MODULE_DEFI=0xC471da2c5299353fEc383c44F528e78E70d96599
SET MODULE_FUNDS=0xC2Cd74A141Ba6696a1Ef1A7713dD3c2A08836703
SET MODULE_CURVE=0x6617EdC6A3BF12B67b57EDc4dd66cd5Cf0Da7D66
SET MODULE_LIQUIDITY=0x6e50C7883831b028530f90bdFAF0F00b2c60519f
SET MODULE_LOAN_LIMITS=0xb0B88ebe92b4C872F4043978D52b77b28Af1b4D4
SET MODULE_LOAN_PROPOSALS=0x9171C80Df1c383E0666742690A460BCFA5Ae6173
SET MODULE_LOAN=0xf51c8D7BC1B06584D24094b4136390e0dC4378c6
SET MODULE_APY_BALANCED_DEFI=%MODULE_DEFI%
SET PROTOCOL_CURVEFI_Y=0x8F75c2F4936aCf7934ff16A9301A274a2fB526a6
SET PROTOCOL_RAY_DAI=0xB629B8e5bC09844eDD16E11e6f2a097672032ddE

rem === ACTION ===
goto :setupProtocolsAndTokens

:init
echo INIT PROJECT, ADD CONTRACTS
call npx oz init
call npx oz add Pool AccessModule PToken FundsModule CurveModule LiquidityModule LoanLimitsModule LoanProposalsModule LoanModule 
call npx oz add APYBalancedDefiModule CurveFiYProtocol RAYProtocol_DAI
goto :done

:createPool
echo CREATE POOL
call npx oz create Pool --network %NETWORK% --init
goto :done

:createModulesAndProtocols
echo CREATE MODULES
call npx oz create AccessModule --network %NETWORK% --init "initialize(address _pool)" --args %MODULE_POOL%
call npx oz create PToken --network %NETWORK% --init "initialize(address _pool)" --args %MODULE_POOL%
call npx oz create CurveModule --network %NETWORK% --init "initialize(address _pool)" --args %MODULE_POOL%
call npx oz create FundsModule --network %NETWORK% --init "initialize(address _pool)" --args %MODULE_POOL%
call npx oz create LiquidityModule --network %NETWORK% --init "initialize(address _pool)" --args %MODULE_POOL%
call npx oz create LoanLimitsModule --network %NETWORK% --init "initialize(address _pool)" --args %MODULE_POOL%
call npx oz create LoanProposalsModule --network %NETWORK% --init "initialize(address _pool)" --args %MODULE_POOL%
call npx oz create LoanModule --network %NETWORK% --init "initialize(address _pool)" --args %MODULE_POOL%
call npx oz create APYBalancedDefiModule --network %NETWORK% --init "initialize(address _pool)" --args %MODULE_POOL%
echo CREATE PROTOCOLS
call npx oz create CurveFiYProtocol --network %NETWORK% --init "initialize(address _pool)" --args "%MODULE_POOL%"
call npx oz create RAYProtocol_DAI --network %NETWORK% --init "initialize(address _pool)" --args "%MODULE_POOL%, %EXT_TOKEN_DAI%"
goto :done

:setupPoolExternalContracts
call npx oz send-tx --to %MODULE_POOL% --network %NETWORK% --method set --args "ray, %EXT_RAY_DAI_STORAGE%, true"
goto :done

:setupPool
echo SETUP POOL: CALL FOR ALL MODULES (set)
call npx oz send-tx --to %MODULE_POOL% --network %NETWORK% --method set --args "access, %MODULE_ACCESS%, false"
call npx oz send-tx --to %MODULE_POOL% --network %NETWORK% --method set --args "ptoken, %MODULE_PTOKEN%, false"
call npx oz send-tx --to %MODULE_POOL% --network %NETWORK% --method set --args "defi, %MODULE_DEFI%, false"
call npx oz send-tx --to %MODULE_POOL% --network %NETWORK% --method set --args "funds, %MODULE_FUNDS%, false"
call npx oz send-tx --to %MODULE_POOL% --network %NETWORK% --method set --args "curve, %MODULE_CURVE%, false"
call npx oz send-tx --to %MODULE_POOL% --network %NETWORK% --method set --args "liquidity, %MODULE_LIQUIDITY%, false"
call npx oz send-tx --to %MODULE_POOL% --network %NETWORK% --method set --args "loan_limits, %MODULE_LOAN_LIMITS%, false"
call npx oz send-tx --to %MODULE_POOL% --network %NETWORK% --method set --args "loan_proposals, %MODULE_LOAN_PROPOSALS%, false"
call npx oz send-tx --to %MODULE_POOL% --network %NETWORK% --method set --args "loan, %MODULE_LOAN%, false"
goto :done

:setupOperators
echo SETUP FUNDS (addFundsOperator for liquidity, loan and loan_proposals)
call npx oz send-tx --to %MODULE_FUNDS% --network %NETWORK% --method addFundsOperator --args %MODULE_LIQUIDITY%
call npx oz send-tx --to %MODULE_FUNDS% --network %NETWORK% --method addFundsOperator --args %MODULE_LOAN_PROPOSALS%
call npx oz send-tx --to %MODULE_FUNDS% --network %NETWORK% --method addFundsOperator --args %MODULE_LOAN%
echo ADD FUNDS AS PTOKEN MINTER (addMinter)
call npx oz send-tx --to %MODULE_PTOKEN% --network %NETWORK% --method addMinter --args %MODULE_FUNDS%
echo ADD FUNDS AS DEFI Operator (addDefiOperator)
call npx oz send-tx --to %MODULE_DEFI% --network %NETWORK% --method addDefiOperator --args %MODULE_FUNDS%
goto :done

:setupProtocolsAndTokens
call npx oz send-tx --to %MODULE_FUNDS% --network %NETWORK% --method registerLToken --args "%EXT_TOKEN_DAI%, %EXT_TOKEN_DAI_RATE%"
call npx oz send-tx --to %MODULE_FUNDS% --network %NETWORK% --method registerLToken --args "%EXT_TOKEN_USDC%, %EXT_TOKEN_USDC_RATE%"
call npx oz send-tx --to %MODULE_FUNDS% --network %NETWORK% --method registerLToken --args "%EXT_TOKEN_USDT%, %EXT_TOKEN_USDT_RATE%"
call npx oz send-tx --to %PROTOCOL_CURVEFI_Y% --network %NETWORK% --method setCurveFi --args %EXT_CURVEFY_Y_DEPOSIT%
call npx oz send-tx --to %MODULE_APY_BALANCED_DEFI% --network %NETWORK% --method registerProtocol --args %PROTOCOL_CURVEFI_Y%
call npx oz send-tx --to %MODULE_APY_BALANCED_DEFI% --network %NETWORK% --method registerProtocol --args %PROTOCOL_RAY_DAI%
goto :done

:setupFee
call npx oz send-tx --to %MODULE_CURVE% --network %NETWORK% --method setWithdrawFee --args 5
goto :done

:done
echo DONE