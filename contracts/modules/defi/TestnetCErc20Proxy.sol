pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "../../interfaces/defi/ICErc20.sol";
import "../../interfaces/defi/ITestnetCompoundDAI.sol";
import "../../token/FreeDAI.sol";
import "../../common/Base.sol";

//solhint-disable func-order
contract TestnetCErc20Proxy is Base, ICErc20, ERC20, ERC20Detailed {
    using SafeMath for uint256;

    ITestnetCompoundDAI public testnetDAI;
    FreeDAI public akropolisDAI;
    ICErc20 public cDAI;

    function initialize(address _akropolisDAI, address _testnetDAI, address _cDAI) public initializer {
        Base.initialize();
        ERC20Detailed.initialize("Compound Dai Proxy", "cDAIp", 8);
        akropolisDAI = FreeDAI(_akropolisDAI);
        testnetDAI = ITestnetCompoundDAI(_testnetDAI);
        cDAI = ICErc20(_cDAI);
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
            testnetDAI.allocateTo(address(this), mintAmount - testnetDAIBalance);
        }

        //Mint cDAI
        testnetDAI.approve(address(cDAI), mintAmount);
        balanceBefore = cDAI.balanceOf(address(this));
        uint256 mintErr = cDAI.mint(mintAmount);
        require(mintErr == 0, "TestnetCErc20Proxy: failed to mint cDAI");
        transfered = cDAI.balanceOf(address(this)).sub(balanceBefore);

        //Transfer cDAI to original sender
        _mint(_msgSender(), transfered);
    }

    function redeem(uint256 redeemTokens) public returns (uint256) {
        // Transfer cDAI to proxy
        _burn(_msgSender(), redeemTokens); //not _burnFrom so that we do not need allowance

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

    function redeemUnderlying(uint256 redeemAmount) public returns (uint256) {
        // Calculate amount of required cDAI
        uint256 exchangeRateMantissa = cDAI.exchangeRateCurrent();
        uint256 redeemTokens = divScalarByExpTruncate(redeemAmount, exchangeRateMantissa);

        // Transfer cDAI to proxy
        _burn(_msgSender(), redeemTokens); //not _burnFrom so that we do not need allowance

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

    function balanceOfUnderlying(address owner) public returns (uint256) {
        uint256 exchangeRate = cDAI.exchangeRateCurrent();
        return mulScalarTruncate(exchangeRate, balanceOf(owner));
    }

    function getBalanceOfUnderlying(address owner) public view returns (uint256) {
        uint256 exchangeRate = cDAI.exchangeRateStored();
        return mulScalarTruncate(exchangeRate, balanceOf(owner));
    }

    // === Directly proxied functions ===
    function exchangeRateCurrent() public returns (uint256) {
        return cDAI.exchangeRateCurrent();
    }

    function exchangeRateStored() public view returns (uint256) {
        return cDAI.exchangeRateStored();
    }

    function accrueInterest() public returns (uint256) {
        return cDAI.accrueInterest();
    }
    
    // === Math ===
    /**
     * @dev Divide a scalar by an Exp mantissa, then truncate to return an unsigned integer.
     * This is simplified version of Exponential.divScalarByExpTruncate()
     */
    function divScalarByExpTruncate(uint256 scalar, uint256 divisorMantissa) pure private returns(uint256){
        return scalar.mul(1e18).div(divisorMantissa);
    }

    function mulScalarTruncate(uint256 multiplierMantissa, uint256 scalar) pure internal returns (uint256) {
        return multiplierMantissa.mul(scalar).div(1e18);
    }
}