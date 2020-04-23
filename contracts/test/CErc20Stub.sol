pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Detailed.sol";
import "../interfaces/defi/ICErc20.sol";
import "../interfaces/defi/ITestnetCompoundDAI.sol";
import "../token/FreeDAI.sol";
import "../common/Base.sol";

contract CErc20Stub is Base, ICErc20, ERC20, ERC20Detailed {
    using SafeMath for uint256;

    uint256 public constant EXP_SCALE = 1e18;  //Exponential scale (see Compound Exponential)
    uint256 public constant INTEREST_RATE = 10 * EXP_SCALE / 100;  // Annual interest 10%
    uint256 public constant INITIAL_RATE = 200000000000000000000000000;    // Same as real cDAI
    uint256 public constant ANNUAL_SECONDS = 365*24*60*60+(24*60*60/4);  // Seconds in a year + 1/4 day to compensate leap years
    uint256 private constant NO_ERROR = 0;

    FreeDAI underlying;
    uint256 created;

    function initialize(address _underlying) public initializer {
        Base.initialize();
        ERC20Detailed.initialize("Compound Dai", "cDAI", 8);
        underlying = FreeDAI(_underlying);
        created = now;
    }

    function exchangeRateCurrent() public returns (uint256) {
        return _exchangeRate();
    }

    function balanceOfUnderlying(address owner) public returns (uint256) {
        return balanceOf(owner).mul(_exchangeRate()).div(EXP_SCALE);
    }

    function mint(uint mintAmount) public returns (uint256) {
        underlying.transferFrom(_msgSender(), address(this), mintAmount);
        uint256 amount = mintAmount.mul(EXP_SCALE).div(_exchangeRate());
        _mint(_msgSender(), amount);
        return NO_ERROR;
    }

    function redeem(uint redeemTokens) public returns (uint256) {
        uint256 redeemAmount = redeemTokens.mul(_exchangeRate()).div(EXP_SCALE);
        _burn(_msgSender(), redeemTokens);
        _sendUnderlyuing(_msgSender(), redeemAmount);
        return NO_ERROR;
    }
    
    function redeemUnderlying(uint redeemAmount) public returns (uint256) {
        uint256 redeemTokens = redeemAmount.mul(EXP_SCALE).div(_exchangeRate());
        _burn(_msgSender(), redeemTokens);
        _sendUnderlyuing(_msgSender(), redeemAmount);
        return NO_ERROR;
    }

    function getBalanceOfUnderlying(address owner) public view returns (uint256) {
        return balanceOf(owner).mul(_exchangeRate()).div(EXP_SCALE);
    }

    function _sendUnderlyuing(address recipient, uint256 amount) internal {
        // Mint AkropolisDAI if required
        uint256 underlyingBalance = underlying.balanceOf(address(this));
        if (amount > underlyingBalance) {
            underlying.mint(amount - underlyingBalance);
        }
        underlying.transfer(recipient, amount);
    }

    function _exchangeRate() internal view returns (uint256) {
        uint256 sec = now.sub(created);
        return INITIAL_RATE.add(INITIAL_RATE.mul(INTEREST_RATE).mul(sec).div(ANNUAL_SECONDS).div(EXP_SCALE));
    }
}