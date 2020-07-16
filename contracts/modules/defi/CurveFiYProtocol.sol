pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "../../interfaces/token/IPToken.sol";
import "../../interfaces/curve/IFundsModule.sol";
import "../../interfaces/defi/IDefiProtocol.sol";
import "../../interfaces/defi/ICurveFiDeposit.sol";
import "../../interfaces/defi/ICurveFiSwap.sol";
import "../../interfaces/defi/IYErc20.sol";
import "./DefiModuleBase.sol";
import "./DefiOperatorRole.sol";

contract CurveFiYProtocol is Module, DefiOperatorRole, IDefiProtocol {
    // Withdrawing one token form Curve.fi pool may lead to small amount of pool token may left unused on Deposit contract. 
    // If DONATE_DUST = true, it will be left there and donated to curve.fi, otherwise we will use gas to transfer it back.
    bool public constant DONATE_DUST = true;    
    uint256 constant MAX_UINT256 = uint256(-1);
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
        Module.initialize(_pool);
        DefiOperatorRole.initialize(_msgSender());
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
        IERC20(curveFiToken).approve(address(curveFiDeposit), MAX_UINT256);
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

    function deposit(address token, uint256 amount) public onlyDefiOperator {
        uint256[N_COINS] memory amounts = [uint256(0), uint256(0), uint256(0)];
        for (uint256 i=0; i < _registeredTokens.length; i++){
            amounts[i] = IERC20(_registeredTokens[i]).balanceOf(address(this)); // Check balance which is left after previous withdrawal
            //amounts[i] = (_registeredTokens[i] == token)?amount:0;
            if (_registeredTokens[i] == token) {
                require(amounts[i] >= amount, "CurveFiYProtocol: requested amount is not deposited");
            }
        }
        curveFiDeposit.add_liquidity(amounts, 0);
    }

    /** 
    * @dev With this function beneficiary pays sleepage and fees (he will receive less tokens)
    */
    function withdraw(address beneficiary, address token, uint256 amount) public onlyDefiOperator {
        uint256 tokenIdx = getTokenIndex(token);
        uint256 available = IERC20(token).balanceOf(address(this));
        amount = amount.sub(available); //Count tokens left after previous withdrawal

        // count shares for proportional withdraw
        uint256 nAmount = normalizeAmount(token, amount);
        uint256 nBalance = normalizedBalance();

        IERC20 curveFiToken = IERC20(curveFiDeposit.token());
        uint256 poolShares = curveFiToken.balanceOf(address(this));
        uint256 withdrawShares = poolShares.mul(nAmount).div(nBalance);

        uint256 minAmount = amount.mul(1e18).div(slippageMultiplier);
        curveFiDeposit.remove_liquidity_one_coin(withdrawShares, int128(tokenIdx), minAmount, DONATE_DUST);

        available = IERC20(token).balanceOf(address(this));
        IERC20 ltoken = IERC20(token);
        ltoken.transfer(beneficiary, available);
    }

    function withdraw(address beneficiary, uint256[] memory amounts) public onlyDefiOperator {
        require(amounts.length == N_COINS, "CurveFiYProtocol: wrong amounts array length");
        uint256[N_COINS] memory amnts = [uint256(0), uint256(0), uint256(0)];
        uint256 i;
        for (i = 0; i < _registeredTokens.length; i++){
            amnts[i] = amounts[i];
        }
        curveFiDeposit.remove_liquidity_imbalance(amnts, MAX_UINT256);
        for (i = 0; i < _registeredTokens.length; i++){
            IERC20 ltoken = IERC20(_registeredTokens[i]);
            ltoken.transfer(beneficiary, amounts[i]);
        }
    }

    function balanceOf(address token) public returns(uint256) {
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
    
    function balanceOfAll() public returns(uint256[] memory balances) {
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

    function normalizedBalance() public returns(uint256) {
        uint256[] memory balances = balanceOfAll();
        uint256 summ;
        for (uint256 i=0; i < _registeredTokens.length; i++){
            summ = summ.add(normalizeAmount(_registeredTokens[i], balances[i]));
        }
        return summ;
    }

    function supportedTokens() public view returns(address[] memory){
        return _registeredTokens;
    }

    function supportedTokensCount() public view returns(uint256) {
        return _registeredTokens.length;
    }

    function getTokenIndex(address token) public view returns(uint256) {
        for (uint256 i=0; i < _registeredTokens.length; i++){
            if (_registeredTokens[i] == token){
                return i;
            }
        }
        revert("CurveFiYProtocol: token not registered");
    }

    function canSwapToToken(address token) public view returns(bool) {
        for (uint256 i=0; i < _registeredTokens.length; i++){
            if (_registeredTokens[i] == token){
                return true;
            }
        }
        return false;
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

    function _registerToken(address token) private {
        IERC20 ltoken = IERC20(token);
        ltoken.approve(address(curveFiDeposit), MAX_UINT256);
        uint256 currentBalance = ltoken.balanceOf(address(this));
        if (currentBalance > 0) {
            deposit(token, currentBalance); 
        }
        emit TokenRegistered(token);
    }

    function _unregisterToken(address token) private {
        uint256 balance = IERC20(token).balanceOf(address(this));

        //TODO: ensure there is no interest on this token which is wating to be withdrawn
        if (balance > 0){
            withdraw(token, getModuleAddress(MODULE_FUNDS), balance);   //This updates withdrawalsSinceLastDistribution
        }
        emit TokenUnregistered(token);
    }

}
