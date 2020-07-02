@echo off
goto :done

:init
echo INIT PROJECT, ADD CONTRACTS
call npx oz init
call npx oz add Pool AccessModule PToken CurveModule FundsModule LiquidityModule LoanLimitsModule LoanProposalsModule LoanModule 
goto :done

:createPool
echo CREATE POOL
call npx oz create Pool --network mainnet --init
goto :done

:createModules
echo CREATE MODULES
call npx oz create AccessModule --network mainnet --init "initialize(address _pool)" --args 0x73067fdd366Cb678E9b539788F4C0f34C5700246
call npx oz create PToken --network mainnet --init "initialize(address _pool)" --args 0x73067fdd366Cb678E9b539788F4C0f34C5700246
call npx oz create CurveModule --network mainnet --init "initialize(address _pool)" --args 0x73067fdd366Cb678E9b539788F4C0f34C5700246
call npx oz create FundsModule --network mainnet --init "initialize(address _pool)" --args 0x73067fdd366Cb678E9b539788F4C0f34C5700246
call npx oz create LiquidityModule --network mainnet --init "initialize(address _pool)" --args 0x73067fdd366Cb678E9b539788F4C0f34C5700246
call npx oz create LoanLimitsModule --network mainnet --init "initialize(address _pool)" --args 0x73067fdd366Cb678E9b539788F4C0f34C5700246
call npx oz create LoanProposalsModule --network mainnet --init "initialize(address _pool)" --args 0x73067fdd366Cb678E9b539788F4C0f34C5700246
call npx oz create LoanModule --network mainnet --init "initialize(address _pool)" --args 0x73067fdd366Cb678E9b539788F4C0f34C5700246
goto :done

:setupPoolExternalContracts
echo SETUP POOL: EXTERNAL CONTRACTS
call npx oz send-tx --to 0x73067fdd366Cb678E9b539788F4C0f34C5700246 --network mainnet --method set --args "ltoken, 0x6b175474e89094c44da98b954eedeac495271d0f, false"
goto :done

:setupPool
echo SETUP POOL: MODULES
call npx oz send-tx --to 0x73067fdd366Cb678E9b539788F4C0f34C5700246 --network mainnet --method set --args "access, 0xfE7B0aeb84D134c5be6b217e51B2b040F5B7cB7B, false"
call npx oz send-tx --to 0x73067fdd366Cb678E9b539788F4C0f34C5700246 --network mainnet --method set --args "ptoken, 0xAA2edc0E5CDE4Da80628972c501e79326741dB17, false"
call npx oz send-tx --to 0x73067fdd366Cb678E9b539788F4C0f34C5700246 --network mainnet --method set --args "curve, 0xFb6b0103063CDf701b733db3Fa3F1c0686F19668, false"
call npx oz send-tx --to 0x73067fdd366Cb678E9b539788F4C0f34C5700246 --network mainnet --method set --args "funds, 0xc88F54A79CaE4C125D7A8c2Cf811daaE78b07D64, false"
call npx oz send-tx --to 0x73067fdd366Cb678E9b539788F4C0f34C5700246 --network mainnet --method set --args "liquidity, 0x543cBc6693f8cBCf0AE5f2cfd9922203cc13b10A, false"
call npx oz send-tx --to 0x73067fdd366Cb678E9b539788F4C0f34C5700246 --network mainnet --method set --args "loan_limits, 0x42b41f636C9eBB150F859f65e3c0f938b0347f59, false"
call npx oz send-tx --to 0x73067fdd366Cb678E9b539788F4C0f34C5700246 --network mainnet --method set --args "loan_proposals, 0xd3bdEdA5e165E67985a4Dc7927E4651Bedd1950c, false"
call npx oz send-tx --to 0x73067fdd366Cb678E9b539788F4C0f34C5700246 --network mainnet --method set --args "loan, 0x42E24De51db5baf6E18F91619195375FBAe63b13, false"
goto :done

:setupFunds
echo SETUP FUNDS (addFundsOperator for liquidity, loan and loan_proposals)
call npx oz send-tx --to 0xc88F54A79CaE4C125D7A8c2Cf811daaE78b07D64 --network mainnet --method addFundsOperator --args 0x543cBc6693f8cBCf0AE5f2cfd9922203cc13b10A
call npx oz send-tx --to 0xc88F54A79CaE4C125D7A8c2Cf811daaE78b07D64 --network mainnet --method addFundsOperator --args 0xd3bdEdA5e165E67985a4Dc7927E4651Bedd1950c
call npx oz send-tx --to 0xc88F54A79CaE4C125D7A8c2Cf811daaE78b07D64 --network mainnet --method addFundsOperator --args 0x42E24De51db5baf6E18F91619195375FBAe63b13
echo ADD FUNDS AS PTOKEN MINTER (addMinter)
call npx oz send-tx --to 0xAA2edc0E5CDE4Da80628972c501e79326741dB17 --network mainnet --method addMinter --args 0xc88F54A79CaE4C125D7A8c2Cf811daaE78b07D64
goto :done

:setupFee
rem call npx oz send-tx --to 0xFb6b0103063CDf701b733db3Fa3F1c0686F19668 --network mainnet --method setWithdrawFee --args 5
goto :done

:setupCurve
call npx oz send-tx --to 0xFb6b0103063CDf701b733db3Fa3F1c0686F19668 --network mainnet --method setCurveParams --args "5000000000000000000000, 1000000000000000000"
goto :done

:setupWhitelist
call npx oz send-tx --to 0xfE7B0aeb84D134c5be6b217e51B2b040F5B7cB7B --network mainnet --method enableWhitelist
goto :done

:done
echo DONE