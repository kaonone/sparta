pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "../../interfaces/curve/IFundsModule.sol";
import "../../interfaces/defi/IDefiModule.sol";
import "../../interfaces/defi/IDefiProtocol.sol";
import "../../common/Module.sol";
import "./DefiModuleBase.sol";

contract APYBalancedDefiModule is DefiModuleBase {
    uint256 constant MAX_UINT256 = uint256(-1);
    uint256 constant ANNUAL_SECONDS = 365*24*60*60+(24*60*60/4);  // Seconds in a year + 1/4 day to compensate leap years
    uint256 constant EXP = 1e18;
    using SafeMath for uint256;

    event APYUpdated(address token, address protocol, uint256 newAPY);

    struct ProtocolInfo {
        uint256 previousPeriodAPY;
        uint256 periodStartTimestamp;
        uint256 periodStartBalance;
        uint256 depositsSincePeriodStart;
        uint256 withdrawalsSincePeriodStart;
    }

    struct TokenData {
        mapping(address => ProtocolInfo) protocols; //mapping of protocol to data we need to calculate APY
    }

    address[] _registeredTokens;
    IDefiProtocol[] registeredProtocols;
    mapping(address => TokenData) tokens;

    function initialize(address _pool) public initializer {
        DefiModuleBase.initialize(_pool);
    }

    function handleDeposit(address token, address sender, uint256 amount) public onlyDefiOperator {
        handleDepositInternal(token, sender, amount);
        emit Deposit(token, amount);
    }

    function withdraw(address token, address beneficiary, uint256 amount) public onlyDefiOperator {
        if (token != address(0)){
            withdrawInternal(token, beneficiary, amount);
        } else {
            withdrawInternalMultiToken(beneficiary, amount);
        }
        emit Withdraw(token, amount);
    }

    function registerProtocol(IDefiProtocol protocol) public onlyDefiOperator {
        uint256 i;
        for (i = 0; i < registeredProtocols.length; i++){
            if (address(registeredProtocols[i]) == address(protocol)) revert("APYBalancedDefiModule: protocol already registered");
        }
        registeredProtocols.push(protocol);
        address[] memory supportedTokens = protocol.supportedTokens();
        for (i = 0; i < supportedTokens.length; i++){
            address tkn = supportedTokens[i];
            if (!isTokenRegistered(tkn)){
                _registeredTokens.push(tkn);
            }
            tokens[tkn].protocols[address(protocol)] = ProtocolInfo({
                previousPeriodAPY: 0,
                periodStartBalance: protocol.balanceOf(tkn),
                periodStartTimestamp: now,
                depositsSincePeriodStart: 0,
                withdrawalsSincePeriodStart: 0
            });
            IERC20(tkn).approve(address(protocol), MAX_UINT256);
        }
    }

    function registeredTokens() public view returns(address[] memory) {
        return _registeredTokens;
    }

    function handleDepositInternal(address token, address, uint256 amount) internal {
        uint256[] memory amounts = splitByProtocolsForDeposit(token, amount);
        for (uint256 i = 0; i < registeredProtocols.length; i++){
            if (amounts[i] == 0) continue;
            IDefiProtocol protocol = registeredProtocols[i];
            uint256[] memory balancesBefore = protocol.balanceOfAll();
            protocol.deposit(token, amounts[i]);
            uint256[] memory balancesAfter = protocol.balanceOfAll();
            updateSaldo(protocol, balancesBefore, balancesAfter);
        }        
    }

    function withdrawInternal(address token, address beneficiary, uint256 amount) internal {
        uint256[][] memory balancesBefore = new uint256[][](registeredProtocols.length);
        uint256[][] memory balancesAfter = new uint256[][](registeredProtocols.length);
        uint256[] memory balances;
        uint256 i;
        uint256 j;

        for (i = 0; i < registeredProtocols.length; i++){
            IDefiProtocol protocol = registeredProtocols[i];
            balances = protocol.balanceOfAll();
            balancesBefore[i] = new uint256[](balances.length);
            for (j = 0; j < balances.length; j++) {
                balancesBefore[i][j] = balances[j];
            }
        }        

        //Check if we can do it fast
        uint256 worstIdx = worstAPYProtocolIdx(token);
        if (registeredProtocols[worstIdx].canSwapToToken(token)){
            uint256 protocolBalance = registeredProtocols[worstIdx].normalizedBalance();
            if (protocolBalance > 0){
                uint256 protocolWithdraw = (amount <= protocolBalance) ? amount : protocolBalance;
                amount = amount.sub(protocolWithdraw);
                uint256 dnWithdraw = denormalizeAmount(token, protocolWithdraw);
                registeredProtocols[worstIdx].withdraw(beneficiary, token, dnWithdraw);
            }
        }
        //Proceed long way with rest
        if (amount > 0) {
            withdrawInternalFromAllProtocols(token, beneficiary, amount);
        }

        for (i = 0; i < registeredProtocols.length; i++){
            IDefiProtocol protocol = registeredProtocols[i];
            balances = protocol.balanceOfAll();
            for (j = 0; j < balances.length; j++) {
                balancesAfter[i][j] = balances[j];
            }
            updateSaldo(protocol, balancesBefore[i], balancesAfter[i]);
        }        
    }

    function withdrawInternalFromAllProtocols(address token, address beneficiary, uint256 amount) internal {
        uint256 i;
        IDefiProtocol protocol;
        // Withdraw form all protocols what we can
        for (i = 0; i < registeredProtocols.length; i++){
            protocol = registeredProtocols[i];
            if (!protocol.canSwapToToken(token)) continue;
            uint256 protocolBalance = protocol.normalizedBalance();
            if (protocolBalance > 0) {
                uint256 protocolWithdraw = (amount <= protocolBalance) ? amount : protocolBalance;
                amount = amount.sub(protocolWithdraw);
                uint256 dnWithdraw = denormalizeAmount(token, protocolWithdraw);
                protocol.withdraw(beneficiary, token, dnWithdraw);
                if (amount == 0) return;
            }
        }
        //Convert rest using liquidity from 1-token protocols
        uint256 converterIdx = converterToTokenProtocolIdx(token);
        IDefiProtocol converter = registeredProtocols[converterIdx];
        uint256 amountToMove = amount;
        for (i = 0; i < registeredProtocols.length; i++){
            if (i == converterIdx) continue; //Skip converter protocol
            protocol = registeredProtocols[i];
            // Move required liquidity from this protocol to converter
            address[] memory supportedTokens = protocol.supportedTokens();
            for (uint256 j = 0; j < supportedTokens.length; j++) {
                uint256 dnAmount = denormalizeAmount(supportedTokens[j], amountToMove);
                uint256 dnProtocolBalance = protocol.balanceOf(supportedTokens[j]);
                uint256 dnProtocolWithdraw = (dnAmount <= dnProtocolBalance) ? dnAmount : dnProtocolBalance;
                amountToMove = amountToMove.sub(normalizeAmount(supportedTokens[j], dnProtocolWithdraw));
                protocol.withdraw(address(this), supportedTokens[j], dnProtocolWithdraw);
                converter.deposit(supportedTokens[j], dnProtocolWithdraw);
                if (amountToMove == 0) break;
            }
            if (amountToMove == 0) break;
        }
        require(amountToMove == 0, "APYBalancedDefiModule: can't find enough liquidity");
        converter.withdraw(beneficiary, token, amount);
    }

    function withdrawInternalMultiToken(address beneficiary, uint256 amount) internal {
        uint256[][] memory balancesBefore = new uint256[][](registeredProtocols.length);
        uint256[][] memory balancesAfter = new uint256[][](registeredProtocols.length);
        uint256[] memory balances;
        uint256 i; 
        uint256 j;
        for (i = 0; i < registeredProtocols.length; i++){
            IDefiProtocol protocol = registeredProtocols[i];
            balances = protocol.balanceOfAll();
            balancesBefore[i] = new uint256[](balances.length);
            for (j = 0; j < balances.length; j++) {
                balancesBefore[i][j] = balances[j];
            }
        }        
        withdrawFromAllProtocols(beneficiary, amount);
        for (i = 0; i < registeredProtocols.length; i++){
            IDefiProtocol protocol = registeredProtocols[i];
            balances = protocol.balanceOfAll();
            balancesAfter[i] = new uint256[](balances.length);
            for (j = 0; j < balances.length; j++) {
                balancesAfter[i][j] = balances[j];
            }
            updateSaldo(protocol, balancesBefore[i], balancesAfter[i]);
        }        
    }

    function poolBalanceOf(address token) internal returns(uint256) {
        uint256 totalBalance;
        for (uint256 i = 0; i < registeredProtocols.length; i++){
            IDefiProtocol protocol = registeredProtocols[i];
            totalBalance = totalBalance.add(protocol.balanceOf(token));
        }
        return totalBalance;
    }

    function updateSaldo(IDefiProtocol protocol, uint256[] memory balancesBefore, uint256[] memory balancesAfter) internal {
        address[] memory supportedTokens = protocol.supportedTokens();
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address tkn = supportedTokens[i];
            ProtocolInfo storage pi = tokens[tkn].protocols[address(protocol)];
            if (balancesBefore[i] < balancesAfter[i]) {
                pi.depositsSincePeriodStart = pi.depositsSincePeriodStart.add(balancesAfter[i].sub(balancesBefore[i]));
            } else if (balancesBefore[i] > balancesAfter[i])  {
                pi.withdrawalsSincePeriodStart = pi.withdrawalsSincePeriodStart.add(balancesBefore[i].sub(balancesAfter[i]));
            }
        }
    }

    function splitByProtocolsForDeposit(address token, uint256 amount) internal returns(uint256[] memory amounts) {
        require(registeredProtocols.length > 0, "APYBalancedDefiModule: no protocols registered");
        uint256 bestProtocolIdx;
        uint256 bestAPY;
        bool haveZeroBalance;
        uint256 i;
        for (i = 0; i < registeredProtocols.length; i++){
            IDefiProtocol protocol = registeredProtocols[i];
            uint256 apy = tokens[token].protocols[address(protocol)].previousPeriodAPY;
            if (apy > bestAPY) {
                bestProtocolIdx = i;
                bestAPY = apy;
            } else if (apy == 0 && !haveZeroBalance) {
                uint256 balance = protocol.balanceOf(token);
                if (balance == 0) haveZeroBalance == true;
            }
        }
        if (bestAPY == 0 || haveZeroBalance){
            // Distribute equally to all protocols
            uint256 distributed;     
            for (i = 0; i < registeredProtocols.length-1; i++){
                amounts[i] = amount.div(registeredProtocols.length);
                distributed = distributed.add(amounts[i]);
            }
            amounts[registeredProtocols.length-1] = amount.sub(distributed); //This is needed to account for rounding during div
        } else {
            amounts[bestProtocolIdx] = amount; //Other values should be 0
        }
    }

    function withdrawFromAllProtocols(address beneficiary, uint256 amount) internal {
        uint256[] memory totalBalances = new uint256[](_registeredTokens.length);
        uint256 i; 
        uint256 j;
        uint256 fullBalance;
        for (i = 0; i < _registeredTokens.length; i++){
            uint256 dnAmount;
            for (j = 0; j < registeredProtocols.length; j++){
                IDefiProtocol protocol = registeredProtocols[i];
                dnAmount = dnAmount.add(protocol.balanceOf(_registeredTokens[i]));
            }
            totalBalances[i] = normalizeAmount(_registeredTokens[i], dnAmount);
            fullBalance = fullBalance.add(totalBalances[i]);
        }
        uint256[] memory amountByTokens = new uint256[](_registeredTokens.length);
        for (i = 0; i < _registeredTokens.length; i++){
            uint256 nAmount = amount.mul(totalBalances[i]).div(fullBalance);
            amountByTokens[i] = denormalizeAmount(_registeredTokens[i], nAmount);
        }
        withdrawFromAllProtocolsByTokens(beneficiary, amountByTokens);
    }

    function withdrawFromAllProtocolsByTokens(address beneficiary, uint256[] memory amountByTokens) internal {
        uint256[] memory flexBalances = new uint256[](_registeredTokens.length);   //Max amount on flexible protocol
        uint256[] memory flexProtocols = new uint256[](_registeredTokens.length);  //Index of flexible protocol for token
        uint256[][] memory protocolAmounts = new uint256[][](registeredProtocols.length); //array of amounts by tokens for each protocol
        uint256 i;
        //First pass to fill unflexible protocols and prepare flexible
        for (i = 0; i < registeredProtocols.length; i++){
            IDefiProtocol protocol = registeredProtocols[i];
            address[] memory protocolTokens = protocol.supportedTokens();
            protocolAmounts[i] = new uint256[](protocolTokens.length);
            if (protocolTokens.length == 1) {
                uint256 tokenIdx = tokenIndex(protocolTokens[0]);
                uint256 protocolBalance = protocol.balanceOf(protocolTokens[0]);
                if (protocolBalance > flexBalances[tokenIdx]) { //Store index of flex protocol with highest balance
                    flexBalances[tokenIdx] = protocolBalance;
                    flexProtocols[tokenIdx] = i;
                }
            }else{
                uint256 maxAmountToBalance = 0;
                uint256[] memory protocolBalance = new uint256[](protocolTokens.length);
                for (uint256 j = 0; j < protocolTokens.length; j++) {
                    uint256 tokenIdx = tokenIndex(protocolTokens[j]);
                    protocolBalance[j] = protocol.balanceOf(protocolTokens[j]);
                    if (amountByTokens[tokenIdx] <= protocolBalance[j]) {
                        uint256 atb = EXP.mul(amountByTokens[tokenIdx]).div(protocolBalance[j]);
                        if (atb > maxAmountToBalance) maxAmountToBalance = atb;
                    } else {
                        //atb = 1* EXP;
                        if (EXP > maxAmountToBalance) maxAmountToBalance = EXP;
                    }
                }
                for (uint256 j = 0; j < protocolTokens.length; j++) {
                    uint256 tokenIdx = tokenIndex(protocolTokens[0]);
                    protocolAmounts[i][j] = protocolBalance[j].mul(maxAmountToBalance).div(EXP);
                    amountByTokens[tokenIdx] = amountByTokens[tokenIdx].sub(protocolAmounts[i][j]);
                }
            }
        }
        // Second pass to fill flexible
        for (i = 0; i < _registeredTokens.length; i++){
            if (amountByTokens[i] > 0) {
                uint256 protocolIdx = flexProtocols[i];
                protocolAmounts[protocolIdx][0] = amountByTokens[i];
            }
        }
        //Do withdrawals
        for (i = 0; i < registeredProtocols.length; i++){
            registeredProtocols[i].withdraw(beneficiary, protocolAmounts[i]);
        }
    }

    function _createDistribution() internal {
        for (uint256 i = 0; i < _registeredTokens.length; i++){
            address token = _registeredTokens[i];
            uint256 totalDeposits;
            uint256 totalWithdraws;
            for (uint256 j = 0; j < registeredProtocols.length; j++){
                IDefiProtocol protocol = registeredProtocols[j];
                uint256 currentBalance = protocol.balanceOf(token);
                ProtocolInfo storage pi = tokens[token].protocols[address(protocol)];
                require(now > pi.periodStartTimestamp, "APYBalancedDefiModule: can not create two distributions in a same block");

                uint256 a = currentBalance.add(pi.withdrawalsSincePeriodStart);
                uint256 b = pi.depositsSincePeriodStart.add(pi.periodStartBalance);
                if (a > b) {
                    uint256 profit = a - b;
                    pi.previousPeriodAPY = EXP.mul(ANNUAL_SECONDS).mul(profit).div(currentBalance).div(now - pi.periodStartTimestamp);
                } else { 
                    //if our balance actually decreased, we count this as 0 profit
                    pi.previousPeriodAPY = 0;
                }

                //Update accumulator
                totalDeposits = totalDeposits.add(pi.depositsSincePeriodStart);
                totalWithdraws = totalWithdraws.add(pi.withdrawalsSincePeriodStart);
                // New period
                pi.periodStartTimestamp = now;
                pi.periodStartBalance = currentBalance;
                pi.depositsSincePeriodStart = 0;
                pi.withdrawalsSincePeriodStart = 0;
                emit APYUpdated(token, address(protocol), pi.previousPeriodAPY);
            }
            // Update DefiModuleBase info
            depositsSinceLastDistribution[token] = totalDeposits;
            withdrawalsSinceLastDistribution[token] = totalWithdraws;
        }        
        super._createDistribution();
    }

    function worstAPYProtocolIdx(address token) internal view returns(uint256) {
        uint256 worstProtocolIdx;
        uint256 worstAPY = MAX_UINT256;
        uint256 i;
        IDefiProtocol protocol;
        for (i = 0; i < registeredProtocols.length; i++){
            protocol = registeredProtocols[i];
            uint256 apy = tokens[token].protocols[address(protocol)].previousPeriodAPY;
            if (apy < worstAPY) {
                worstProtocolIdx = i;
                worstAPY = apy;
            }
        }
        return worstProtocolIdx;
    }

    function converterToTokenProtocolIdx(address token) internal view returns(uint256) {
        for (uint256 i = 0; i < registeredProtocols.length; i++){
            IDefiProtocol protocol = registeredProtocols[i];
            if (!protocol.canSwapToToken(token)) continue;
            if (protocol.supportedTokensCount() > 1) return i;
        }
        revert("APYBalancedDefiModule: no multitoken protocol available for requested token");
    }

    function isTokenRegistered(address token) internal view returns(bool) {
        for (uint256 i = 0; i < _registeredTokens.length; i++){
            if (_registeredTokens[i] == token) return true;
        }
        return false;
    }

    function tokenIndex(address token) internal view returns(uint256) {
        for (uint256 i = 0; i < _registeredTokens.length; i++){
            if (_registeredTokens[i] == token) return i;
        }
        revert("APYBalancedDefiModule: token not registered");
    }

    function normalizeAmount(address token, uint256 value) internal view returns(uint256) {
        return fundsModule().normalizeLTokenValue(token, value);
    }

    function denormalizeAmount(address token, uint256 value) internal view returns(uint256) {
        return fundsModule().denormalizeLTokenValue(token, value);
    }

    function fundsModule() internal view returns(IFundsModule) {
        return IFundsModule(getModuleAddress(MODULE_FUNDS));
    }
}
