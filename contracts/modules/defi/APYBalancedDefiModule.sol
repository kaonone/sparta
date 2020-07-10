pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
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

    function registerProtocol(IDefiProtocol protocol) public onlyDefiOperator {
        uint256 i;
        for (i = 0; i < registeredProtocols.length; i++){
            if (address(registeredProtocols[i]) == address(protocol)) revert("APYBalancedDefiModule: protocol already registered");
        }
        registeredProtocols.push(protocol);
        address[] memory supportedTokens = protocol.supportedTokens();
        for (i = 0; i < supportedTokens.length; i++){
            address tkn = supportedTokens[i];
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
        uint256[] memory amounts = splitByProtocolsForWithdraw(token, amount);
        for (uint256 i = 0; i < registeredProtocols.length; i++){
            if (amounts[i] == 0) continue;
            IDefiProtocol protocol = registeredProtocols[i];
            uint256[] memory balancesBefore = protocol.balanceOfAll();
            protocol.withdraw(beneficiary, token, amounts[i]);
            uint256[] memory balancesAfter = protocol.balanceOfAll();
            updateSaldo(protocol, balancesBefore, balancesAfter);
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

    function splitByProtocolsForWithdraw(address token, uint256 amount) internal returns(uint256[] memory amounts) {
        require(registeredProtocols.length > 0, "APYBalancedDefiModule: no protocols registered");
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
        protocol = registeredProtocols[worstProtocolIdx];
        uint256 balance = protocol.balanceOf(token);
        if (balance >= amount){
            amounts[worstProtocolIdx] = amount;
        }else{
            amounts[worstProtocolIdx] = balance;
            amount = amount.sub(balance);
            for (i = 0; i < registeredProtocols.length; i++){
                if (i == worstProtocolIdx) continue;
                protocol = registeredProtocols[i];
                balance = protocol.balanceOf(token);
                if (balance >= amount) {
                    amounts[i] = amount;
                    amount = 0;
                    break;
                } else {
                    amounts[i] = balance;
                    amount = amount.sub(balance);
                    if (amount == 0) break;
                }
            }
            require(amount == 0, "APYBalancedDefiModule: not enough balance on all protocols");
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
                // New period
                pi.periodStartTimestamp = now;
                pi.periodStartBalance = currentBalance;
                pi.depositsSincePeriodStart = 0;
                pi.withdrawalsSincePeriodStart = 0;
                emit APYUpdated(token, address(protocol), pi.previousPeriodAPY);
                totalDeposits = totalDeposits.add(pi.depositsSincePeriodStart);
                totalWithdraws = totalWithdraws.add(pi.withdrawalsSincePeriodStart);
            }        
            depositsSinceLastDistribution[token] = totalDeposits;
            withdrawalsSinceLastDistribution[token] = totalWithdraws;
        }        
        super._createDistribution();
    }

}
