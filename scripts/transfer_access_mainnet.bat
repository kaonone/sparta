@echo off
rem === DEFINE MODULES ===
SET PROXY_ADMIN=0x93C873b55D4C0529F43f267f1284f8A472E6Ef48
SET MODULE_ACCESS=0xfE7B0aeb84D134c5be6b217e51B2b040F5B7cB7B
SET MODULE_PTOKEN=0xAA2edc0E5CDE4Da80628972c501e79326741dB17
SET MODULE_CURVE=0xFb6b0103063CDf701b733db3Fa3F1c0686F19668
SET MODULE_FUNDS=0xc88F54A79CaE4C125D7A8c2Cf811daaE78b07D64
SET MODULE_LIQUIDITY=0x543cBc6693f8cBCf0AE5f2cfd9922203cc13b10A
SET MODULE_LOAN_LIMITS=0x42b41f636C9eBB150F859f65e3c0f938b0347f59
SET MODULE_LOAN_PROPOSALS=0xd3bdEdA5e165E67985a4Dc7927E4651Bedd1950c
SET MODULE_LOAN=0x42E24De51db5baf6E18F91619195375FBAe63b13
rem === DEFINE NEW OWNERS ===
set NEW_OWNER=0x6DB2E943664874EaC10a26274FD26Df3e219caD5
goto :done

:addRoles
echo ADD ROLES TO NEW OWNER
call npx oz send-tx --to %MODULE_ACCESS% --network mainnet --method addWhitelistAdmin --args %NEW_OWNER%
call npx oz send-tx --to %MODULE_PTOKEN% --network mainnet --method addMinter --args %NEW_OWNER%
call npx oz send-tx --to %MODULE_FUNDS% --network mainnet --method addFundsOperator --args %NEW_OWNER%
goto :done

:removeCurrentRoles
echo REMOVE ROLES FORM OLD OWNER
call npx oz send-tx --to %MODULE_ACCESS% --network mainnet --method renounceWhitelistAdmin
call npx oz send-tx --to %MODULE_PTOKEN% --network mainnet --method renounceMinter
call npx oz send-tx --to %MODULE_FUNDS% --network mainnet --method renounceFundsOperator
goto :done

:transferModuleOwnership
echo TRANSFER MODULE OWNERSHIP
call npx oz send-tx --to %MODULE_ACCESS% --network mainnet --method transferOwnership --args %NEW_OWNER%
call npx oz send-tx --to %MODULE_PTOKEN% --network mainnet --method transferOwnership --args %NEW_OWNER%
call npx oz send-tx --to %MODULE_CURVE% --network mainnet --method transferOwnership --args %NEW_OWNER%
call npx oz send-tx --to %MODULE_FUNDS% --network mainnet --method transferOwnership --args %NEW_OWNER%
call npx oz send-tx --to %MODULE_LIQUIDITY% --network mainnet --method transferOwnership --args %NEW_OWNER%
call npx oz send-tx --to %MODULE_LOAN_LIMITS% --network mainnet --method transferOwnership --args %NEW_OWNER%
call npx oz send-tx --to %MODULE_LOAN_PROPOSALS% --network mainnet --method transferOwnership --args %NEW_OWNER%
call npx oz send-tx --to %MODULE_LOAN% --network mainnet --method transferOwnership --args %NEW_OWNER%
goto :done

:transferUpgradeAdmin
echo TRANSFER UPGRADE ADMIN OWNERSHIP
call npx oz send-tx --to %PROXY_ADMIN% --network mainnet --method transferOwnership --args %NEW_OWNER%
goto :done

:done
echo DONE