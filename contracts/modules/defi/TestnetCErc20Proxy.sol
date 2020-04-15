pragma solidity ^0.5.12;

import "../../interfaces/defi/ICErc20.sol";
import "../../interfaces/defi/ITestnetCompoundDAI.sol";
import "../../token/FreeDAI.sol";
import "../../common/Base.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";

contract TestnetCErc20Proxy is Base {
    using SafeMath for uint256;

    ITestnetCompoundDAI public testnetDAI;
    FreeDAI public akropolisDAI;
    ICErc20 public cDAI;

    function initialize(address _akropolisDAI, address _testnetDAI) public initializer {
        Base.initialize();
        akropolisDAI = FreeDAI(_akropolisDAI);
        testnetDAI = ITestnetCompoundDAI(_testnetDAI);
    }

    // === Modified proxied functions ===
    function mint(uint256 mintAmount) public returns (uint256) {
        uint256 balanceBefore;
        uint256 transfered;

        //Transfer Akropolis DAI to Proxy
        balanceBefore = akropolisDAI.balanceOf(address(this));
        akropolisDAI.transferFrom(_msgSender(), address(this), mintAmount);
        transfered = akropolisDAI.balanceOf(address(this)).sub(balanceBefore);
        assert(transfered == mintAmount);

        //Allocate Compound DAI
        uint256 testnetDAIBalance = testnetDAI.balanceOf(address(this));
        if (mintAmount > testnetDAIBalance) {
            testnetDAI.allocateTo(address(this), testnetDAIBalance.sub(mintAmount));
        }

        //Mint cDAI
        balanceBefore = cDAI.balanceOf(address(this));
        uint256 mintErr = cDAI.mint(mintAmount);
        require(mintErr == 0, "TestnetCErc20Proxy: failed to mint cDAI");
        transfered = cDAI.balanceOf(address(this)).sub(balanceBefore);

        //Transfer cDAI to original sender
        require(cDAI.transfer(_msgSender(), transfered), "TestnetCErc20Proxy: failed to transfer minted cDAI");
    }

    function redeem(uint256 redeemTokens) external returns (uint256) {
        // Transfer cDAI to proxy
        cDAI.transferFrom(_msgSender(), address(this), redeemTokens);

        // Execute exchange
        cDAI.approve(address(cDAI), redeemTokens);
        uint256 balanceBefore = testnetDAI.balanceOf(address(this));
        cDAI.redeem(redeemTokens);
        uint256 transfered = testnetDAI.balanceOf(address(this)).sub(balanceBefore);

        // Mint AkropolisDAI if required
        uint256 akropolisDAIBalance = akropolisDAI.balanceOf(address(this));
        if (transfered > akropolisDAIBalance) {
            akropolisDAI.mint(transfered - akropolisDAIBalance);
        }

        //Send redeemed amount
        akropolisDAI.transfer(_msgSender(), transfered);
    }

    function redeemUnderlying(uint256 redeemAmount) external returns (uint256) {
        // Calculate amount of required cDAI
        uint256 exchangeRateMantissa = cDAI.exchangeRateCurrent();
        uint256 redeemTokens = divScalarByExpTruncate(redeemAmount, exchangeRateMantissa);

        // Transfer cDAI to proxy
        cDAI.transferFrom(_msgSender(), address(this), redeemTokens);

        // Execute exchange
        cDAI.approve(address(cDAI), redeemTokens);
        uint256 balanceBefore = testnetDAI.balanceOf(address(this));
        cDAI.redeemUnderlying(redeemAmount);
        uint256 transfered = testnetDAI.balanceOf(address(this)).sub(balanceBefore);

        // Mint AkropolisDAI if required
        uint256 akropolisDAIBalance = akropolisDAI.balanceOf(address(this));
        if (transfered > akropolisDAIBalance) {
            akropolisDAI.mint(transfered - akropolisDAIBalance);
        }

        //Send redeemed amount
        akropolisDAI.transfer(_msgSender(), transfered);
    }


    // === Directly proxied functions ===
    function balanceOf(address owner) external view returns (uint){
        return cDAI.balanceOf(owner);
    }
    function balanceOfUnderlying(address owner) external returns (uint) {
        return cDAI.balanceOfUnderlying(owner);
    }
    function exchangeRateCurrent() public returns (uint) {
        return cDAI.exchangeRateCurrent();
    }

    // === Math ===

    /**
     * @dev Divide a scalar by an Exp mantissa, then truncate to return an unsigned integer.
     * This is simplified version of Exponential.divScalarByExpTruncate()
     */
    function divScalarByExpTruncate(uint scalar, uint256 divisorMantissa) pure private returns(uint256){
        return scalar.mul(1e18).div(divisorMantissa);
    }

}