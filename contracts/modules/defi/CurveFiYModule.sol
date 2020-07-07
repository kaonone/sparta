pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "../../interfaces/token/IPToken.sol";
import "../../interfaces/defi/ICurveFiDeposit.sol";
import "../../interfaces/defi/ICurveFiSwap.sol";
import "../../interfaces/defi/IYErc20.sol";
import "./DefiModuleBase.sol";

contract CurveFiYModule is DefiModuleBase {
    // Withdrawing one token form Curve.fi pool may lead to small amount of pool token may left unused on Deposit contract. 
    // If DONATE_DUST = true, it will be left there and donated to curve.fi, otherwise we will use gas to transfer it back.
    bool public constant DONATE_DUST = true;    
    uint256 constant N_COINS = 3;

    using SafeMath for uint256;

    event CurveFiYSetup(address swap, address deposit);
    event TokenRegistered(address indexed token);
    event TokenUnregistered(address indexed token);

    ICurveFiSwap public curveFiSwap;
    ICurveFiDeposit public curveFiDeposit;
    address[] _registeredTokens;
    uint256 public slippageMultiplier; //Multiplier to work-around slippage when witharawing one token

    function initialize(address _pool) public initializer {
        DefiModuleBase.initialize(_pool);
        _registeredTokens = new address[](N_COINS);
        slippageMultiplier = 1.01*1e18;     //Max slippage - 1%, if more - tx will fail
    }

    function setCurveFi(address deposit) public onlyDefiOperator {
        if (address(curveFiDeposit) != address(0)) {
            //We need to unregister tokens first
            for (uint256 i=0; i < _registeredTokens.length; i++){
                if (_registeredTokens[i] != address(0)) {
                    _unregisterToken(_registeredTokens[i]);
                    _registeredTokens[i] = address(0);
                }
            }
        }
        curveFiDeposit = ICurveFiDeposit(deposit);
        curveFiSwap = ICurveFiSwap(curveFiDeposit.curve());
        address curveFiToken = curveFiDeposit.token();
        IERC20(curveFiToken).approve(address(curveFiDeposit), 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF);
        emit CurveFiYSetup(address(curveFiSwap), address(curveFiDeposit));
        for (uint256 i=0; i < _registeredTokens.length; i++){
            address token = curveFiDeposit.underlying_coins(int128(i));
            _registeredTokens[i] = token;
            _registerToken(token);
        }
    }

    function setSlippageMultiplier(uint256 _slippageMultiplier) public onlyDefiOperator {
        require(_slippageMultiplier >= 1e18, "CurveFiYModule: multiplier should be > 1");
        slippageMultiplier = _slippageMultiplier;
    }

    function withdrawAll() public onlyOwner {
        IERC20 curveFiToken = IERC20(curveFiDeposit.token());
        uint256 curveFiTokenBalance = curveFiToken.balanceOf(address(this));
        curveFiDeposit.remove_liquidity(curveFiTokenBalance, [uint256(0), uint256(0), uint256(0)]);
        for (uint256 i=0; i < _registeredTokens.length; i++){
            IERC20 ltoken = IERC20(_registeredTokens[i]);
            uint256 amount = ltoken.balanceOf(address(this));
            ltoken.transfer(getModuleAddress(MODULE_FUNDS), amount);
        }            
    }

    function registeredTokens() public view returns(address[] memory){
        return _registeredTokens;
    }

    function getTokenIndex(address token) public view returns(uint256) {
        uint256 tokenIdx = _registeredTokens.length;
        for (uint256 i=0; i < _registeredTokens.length; i++){
            if (_registeredTokens[i] == token){
                tokenIdx = i;
                break;
            }
        }
        require(tokenIdx < _registeredTokens.length, "CurveFiYModule: token not registered");
        return tokenIdx;
    }

    function handleDepositInternal(address token, address, uint256 amount) internal {
        uint256[] memory originalBalances = yCurveFiUnderlyingBalances();
        uint256[N_COINS] memory amounts = [uint256(0), uint256(0), uint256(0)];
        for (uint256 i=0; i < _registeredTokens.length; i++){
            amounts[i] = IERC20(_registeredTokens[i]).balanceOf(address(this)); // Check balance which is left after previous withdrawal
            //amounts[i] = (_registeredTokens[i] == token)?amount:0;
            if (_registeredTokens[i] == token) {
                require(amounts[i] >= amount, "CurveFiYModule: requested amount is not deposited");
            }
        }
        curveFiDeposit.add_liquidity(amounts, 0);
        rebalanceDepositsAndWithdrawals(token, amount, true, originalBalances);
    }

    function withdrawInternal(address token, address beneficiary, uint256 amount) internal {
        uint256[] memory originalBalances = yCurveFiUnderlyingBalances();
        uint256 tokenIdx = getTokenIndex(token);
        uint256 available = IERC20(_registeredTokens[tokenIdx]).balanceOf(address(this));
        amount = amount.sub(available); //Count tokens left after previous withdrawal
        IYErc20 yToken = IYErc20(curveFiDeposit.coins(int128(tokenIdx)));
        uint256 yAmount = amount.mul(1e18).div(yToken.getPricePerFullShare());

        uint256[N_COINS] memory amounts = [uint256(0), uint256(0), uint256(0)];
        amounts[tokenIdx] = yAmount;
        uint256 shares = curveFiSwap.calc_token_amount(amounts, false);
        shares = shares.mul(slippageMultiplier).div(1e18);

        curveFiDeposit.remove_liquidity_one_coin(shares, int128(tokenIdx), amount, DONATE_DUST);

        IERC20 ltoken = IERC20(token);
        ltoken.transfer(beneficiary, amount);
        rebalanceDepositsAndWithdrawals(token, amount, false, originalBalances);
    }

    function poolBalanceOf(address token) internal returns(uint256) {
        uint256 tokenIdx = getTokenIndex(token);

        IERC20 curveFiToken = IERC20(curveFiDeposit.token());
        uint256 curveFiTokenBalance = curveFiToken.balanceOf(address(this));
        uint256 curveFiTokenTotalSupply = curveFiToken.totalSupply();
        uint256 yTokenCurveFiBalance = curveFiSwap.balances(int128(tokenIdx));
        
        uint256 yTokenShares = yTokenCurveFiBalance.mul(curveFiTokenBalance).div(curveFiTokenTotalSupply);
        IYErc20 yToken = IYErc20(curveFiDeposit.coins(int128(tokenIdx)));
        uint256 tokenBalance = yToken.getPricePerFullShare().mul(yTokenShares).div(1e18); //getPricePerFullShare() returns balance of underlying token multiplied by 1e18

        return tokenBalance;
    }
    
    function rebalanceDepositsAndWithdrawals(address token, uint256 originalAmount, bool deposit, uint256[] memory originalBalances) internal {
        uint256[] memory currentBalances = yCurveFiUnderlyingBalances();
        if (deposit) {
            depositsSinceLastDistribution[token] = depositsSinceLastDistribution[token].sub(originalAmount);
        } else {
            withdrawalsSinceLastDistribution[token] = withdrawalsSinceLastDistribution[token].sub(originalAmount);
        }
        for (uint256 i=0; i < _registeredTokens.length; i++){
            address tkn = _registeredTokens[i];
            uint256 diff;
            if (currentBalances[i] >= originalBalances[i]){
                diff = currentBalances[i].sub(originalBalances[i]);
                depositsSinceLastDistribution[tkn] = depositsSinceLastDistribution[tkn].add(diff);
            } else {
                diff = originalBalances[i].sub(currentBalances[i]);
                withdrawalsSinceLastDistribution[tkn] = withdrawalsSinceLastDistribution[tkn].add(diff);
            }
        }
    }

    function yCurveFiUnderlyingBalances() internal view returns(uint256[] memory balances) {
        IERC20 cfToken = IERC20(curveFiDeposit.token());
        uint256 cfBalance = cfToken.balanceOf(address(this));
        uint256 cfTotalSupply = cfToken.totalSupply();

        balances = new uint256[](_registeredTokens.length);
        for (uint256 i=0; i < _registeredTokens.length; i++){
            uint256 ycfBalance = curveFiSwap.balances(int128(i));
            uint256 yShares = ycfBalance.mul(cfBalance).div(cfTotalSupply);
            IYErc20 yToken = IYErc20(curveFiDeposit.coins(int128(i)));
            balances[i] = yToken.getPricePerFullShare().mul(yShares).div(1e18); //getPricePerFullShare() returns balance of underlying token multiplied by 1e18
        }
    }

    function totalSupplyOfPTK() internal view returns(uint256) {
        return pToken().distributionTotalSupply();
    }

    function _registerToken(address token) private {
        IERC20 ltoken = IERC20(token);
        ltoken.approve(address(curveFiDeposit), 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF);
        uint256 currentBalance = ltoken.balanceOf(address(this));
        if (currentBalance > 0) {
            handleDeposit(token, address(0), currentBalance); //This updates depositsSinceLastDistribution
        }
        emit TokenRegistered(token);
    }

    function _unregisterToken(address token) private {
        uint256 balance = poolBalanceOf(token);

        //TODO: ensure there is no interest on this token which is wating to be withdrawn
        if (balance > 0){
            withdraw(token, getModuleAddress(MODULE_FUNDS), balance);   //This updates withdrawalsSinceLastDistribution
        }
        emit TokenUnregistered(token);
    }

    function pToken() private view returns(IPToken){
        return IPToken(getModuleAddress(MODULE_PTOKEN));
    }
}
