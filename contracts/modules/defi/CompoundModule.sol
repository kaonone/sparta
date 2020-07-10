pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "../../interfaces/token/IPToken.sol";
import "../../interfaces/defi/ICErc20.sol";
import "./DefiModuleBase.sol";

contract CompoundModule is DefiModuleBase {

    event TokenRegistered(address indexed token, address cToken);
    event TokenUnregistered(address indexed token);

    struct TokenData {
        address cToken;
    }

    address[] _registeredTokens;
    mapping(address => TokenData) public tokens;

    function initialize(address _pool) public initializer {
        DefiModuleBase.initialize(_pool);
    }

    function registerToken(address token, address cToken) public onlyDefiOperator {
        require(token != address(0), "CompoundModule: incorrect token address");
        require(cToken != address(0), "CompoundModule: incorrect cToken address");
        tokens[token] = TokenData({
            cToken: cToken
        });
        _registeredTokens.push(token);
        uint256 cuurentBalance = IERC20(token).balanceOf(address(this));
        if (cuurentBalance > 0) {
            handleDeposit(token, address(0), cuurentBalance); //This updates depositsSinceLastDistribution
        }
        emit TokenRegistered(token, cToken);
    }

    function unregisterToken(address token) public onlyDefiOperator {
        uint256 balance = poolBalanceOf(token);

        //TODO: ensure there is no interest on this token which is wating to be withdrawn

        //Find position of token we are removing
        uint256 pos;
        for (pos = 0; pos < _registeredTokens.length; pos++) {
            if (_registeredTokens[pos] == token) break;
        }
        assert(_registeredTokens[pos] == token); // This should never fail because we know token is registered
        if (pos == _registeredTokens.length - 1) {
            // Removing last token
            _registeredTokens.pop();
        } else {
            // Replace token we are going to delete with the last one and remove it
            address last = _registeredTokens[_registeredTokens.length-1];
            _registeredTokens.pop();
            _registeredTokens[pos] = last;
        }

        if (balance > 0){
            withdraw(token, getModuleAddress(MODULE_FUNDS), balance);   //This updates withdrawalsSinceLastDistribution
        }
        delete tokens[token];

        emit TokenUnregistered(token);
    }

    function registeredTokens() public view returns(address[] memory){
        return _registeredTokens;
    }

    function handleDepositInternal(address token, address, uint256 amount) internal {
        IERC20 ltoken = IERC20(token);
        ICErc20 ctoken = ICErc20(tokens[token].cToken);
        ltoken.approve(address(ctoken), amount);
        ctoken.mint(amount);
    }

    function withdrawInternal(address token, address beneficiary, uint256 amount) internal {
        IERC20 ltoken = IERC20(token);
        ICErc20 ctoken = ICErc20(tokens[token].cToken);
        ctoken.redeemUnderlying(amount);
        ltoken.transfer(beneficiary, amount);
    }

    function poolBalanceOf(address token) internal returns(uint256) {
        ICErc20 ctoken = ICErc20(tokens[token].cToken);
        return ctoken.balanceOfUnderlying(address(this));
    }
  
}
