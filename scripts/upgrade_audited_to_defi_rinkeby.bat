@echo off
goto :done

:init
call npx oz add RAYModule
goto :done

:setupPoolExternalContracts
echo SETUP POOL: EXTERNAL CONTRACTS
call npx oz send-tx --to 0x113462A2c643dFEb47E9Cc3938FCBab04a058dF9 --network rinkeby --method set --args "ray, 0x21091e9DACac70A9E511a26CE538Ad27Ddb92AcD, false"
goto :done

:createModules
echo CREATE MODULES
call npx oz create RAYModule --network rinkeby --init "initialize(address _pool)" --args 0x113462A2c643dFEb47E9Cc3938FCBab04a058dF9
goto :done

:setupPool
echo SETUP POOL: MODULES
call npx oz send-tx --to 0x113462A2c643dFEb47E9Cc3938FCBab04a058dF9 --network rinkeby --method set --args "defi, 0x8413433fb3A7EC491c51d415AC437A32C5C81a40, false"
goto :done

:setupFunds
echo ADD FUNDS AS DEFI Operator
call npx oz send-tx --to 0x8413433fb3A7EC491c51d415AC437A32C5C81a40 --network rinkeby --method addDefiOperator --args 0xa157b6A439ae79dC6e6bf2E170bf0DcfcAEB5AdE
goto :done

:upgrade
echo UPGRADE
call npx oz upgrade --network rinkeby --all
goto :done

:moveFunds
echo MOVE FUNDS
call npx oz send-tx --to 0xa157b6A439ae79dC6e6bf2E170bf0DcfcAEB5AdE --network rinkeby --method depositAllToDefi
goto :done

:done
echo DONE