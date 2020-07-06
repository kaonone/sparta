@echo off
rem === DEFINE MODULES ===
SET MODULE_POOL=0xf25865c1a943230ceca399a45832C36cE6B89BAa
SET MODULE_ACCESS=0xF62B1E7Dbe48873e4FfDd202De501eeb3bBf916c
SET MODULE_PTOKEN=0x0C334d18a421857A1dDADb754da4AD115E1c148C
SET MODULE_CURVE=0x7e61d2519e774E76632614A9481b9c4F6e86E972
SET MODULE_FUNDS=0x189665a0d5E3405F112F9a65882C5a164ceB0d63
SET MODULE_LIQUIDITY=0x02134CD73f8E0b914aB171e2639C4f94067E3b38
SET MODULE_LOAN_LIMITS=0xB49AF7d992af0985ce0E3074D39600185dc14778
SET MODULE_LOAN_PROPOSALS=0x73606C46C1dF7B1AC469841b7ce4eD4F5e7232c3
SET MODULE_LOAN=0x83014614e8c4Cd564C4DbCB4A6Ef11d056dE7029
rem === DEFINE NEW OWNERS ===
set NEW_OWNER=0xD5D72fE2C411Fae05Bc447616aA0020101e39122
goto :transferUpgradeAdmin

:addRoles
echo ADD ROLES TO NEW OWNER
call npx oz send-tx --to %MODULE_ACCESS% --network rinkeby --method addWhitelistAdmin --args %NEW_OWNER%
call npx oz send-tx --to %MODULE_PTOKEN% --network rinkeby --method addMinter --args %NEW_OWNER%
call npx oz send-tx --to %MODULE_FUNDS% --network rinkeby --method addFundsOperator --args %NEW_OWNER%
goto :done

:removeCurrentRoles
echo REMOVE ROLES FORM OLD OWNER
call npx oz send-tx --to %MODULE_ACCESS% --network rinkeby --method renounceWhitelistAdmin
call npx oz send-tx --to %MODULE_PTOKEN% --network rinkeby --method renounceMinter
call npx oz send-tx --to %MODULE_FUNDS% --network rinkeby --method renounceFundsOperator
goto :done

:transferModuleOwnership
echo TRANSFER MODULE OWNERSHIP
call npx oz send-tx --to %MODULE_POOL% --network rinkeby --method transferOwnership --args %NEW_OWNER%
call npx oz send-tx --to %MODULE_ACCESS% --network rinkeby --method transferOwnership --args %NEW_OWNER%
call npx oz send-tx --to %MODULE_PTOKEN% --network rinkeby --method transferOwnership --args %NEW_OWNER%
call npx oz send-tx --to %MODULE_CURVE% --network rinkeby --method transferOwnership --args %NEW_OWNER%
call npx oz send-tx --to %MODULE_FUNDS% --network rinkeby --method transferOwnership --args %NEW_OWNER%
call npx oz send-tx --to %MODULE_LIQUIDITY% --network rinkeby --method transferOwnership --args %NEW_OWNER%
call npx oz send-tx --to %MODULE_LOAN_LIMITS% --network rinkeby --method transferOwnership --args %NEW_OWNER%
call npx oz send-tx --to %MODULE_LOAN_PROPOSALS% --network rinkeby --method transferOwnership --args %NEW_OWNER%
call npx oz send-tx --to %MODULE_LOAN% --network rinkeby --method transferOwnership --args %NEW_OWNER%
goto :done

:transferUpgradeAdmin
echo TRANSFER UPGRADE ADMIN OWNERSHIP TO %NEW_OWNER%
call npx oz set-admin %NEW_OWNER% --network rinkeby
goto :done

:done
echo DONE