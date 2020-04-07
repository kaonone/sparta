pragma solidity ^0.5.12;

import "../../interfaces/defi/ICErc20.sol";
import "../../interfaces/defi/ITestnetCompoundDAI.sol";
import "../../token/FreeDAI.sol";
import "../../common/Base.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";

contract TestnetCErc20Proxy is /*ICErc20,*/ Base {
    using SafeMath for uint256;

    ITestnetCompoundDAI testnetDAI;
    FreeDAI akropolisDAI;
    ICErc20 cDAI;

    function initialize(address _akropolisDAI, address _testnetDAI) public initializer {
        Base.initialize();
        akropolisDAI = FreeDAI(_akropolisDAI);
        testnetDAI = ITestnetCompoundDAI(_testnetDAI);
    }

    function mint(uint mintAmount) public returns (uint) {
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

}