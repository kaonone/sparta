pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "../../interfaces/defi/IDefiModule.sol";
import "./BaseFundsModule.sol";

/**
* @notice FundsModule extended to use DeFi module as a storage for DAI
*
* @dev It's important to NOT STORE any state variables in this contract, to make it easealy changable to another storage.
* If some variables are needed, consider to move it either to BaseFundsModule or, prefferably, to DeFi module.
*/
contract DefiFundsModule is BaseFundsModule {
    struct DefiFundsSettings {
        uint256 minInstantAmount;   // Minimal amount stored on FundsModule to be available for loans with low gas usage
        uint256 maxInstantAmount;   // Amount which triggers moving funds to DeFi module
    }

    DefiFundsSettings public defiSettings;

    function initialize(address _pool) public initializer {
        BaseFundsModule.initialize(_pool);
        //setDefiSettings(0, 0);
    }

    function withdrawAllFromDefi() public onlyFundsOperator {
        uint256 amount = defiModule().poolBalance();
        defiModule().withdraw(address(this), amount);
    }

    function depositAllToDefi() public onlyFundsOperator {
        uint256 amount = lToken().balanceOf(address(this));
        lToken().transfer(address(defiModule()), amount);
        defiModule().handleDeposit(address(this), amount);
    }

    function setDefiSettings(uint256 minInstantAmount, uint256 maxInstantAmount) public onlyOwner {
        require(maxInstantAmount >= minInstantAmount, "DefiFundsModule: max should be >= min");
        defiSettings.minInstantAmount = minInstantAmount;
        defiSettings.maxInstantAmount = maxInstantAmount;
        redistributeFunds();
    }

    function lTransferToFunds(address from, uint256 amount) internal {
        IERC20 lToken = lToken();
        require(lToken.transferFrom(from, address(this), amount), "DefiFundsModule: incoming transfer failed");

        uint256 fundsBalance = lToken.balanceOf(address(this));
        if (fundsBalance > defiSettings.maxInstantAmount){
            uint256 diff = fundsBalance - defiSettings.minInstantAmount; //Safe because maxInstantAmount >= minInstantAmount
            require(lToken.transfer(address(defiModule()), diff), "DefiFundsModule: deposit to DefiModule failed");
            defiModule().handleDeposit(address(this), diff);
        }
    }

    function lTransferFromFunds(address to, uint256 amount) internal {
        IERC20 lToken = lToken();
        uint256 fundsBalance = lToken.balanceOf(address(this));
        if (fundsBalance < amount) {
            uint256 diff = amount - fundsBalance;
            defiModule().withdraw(address(this), diff);    
        }
        lToken.transfer(to, amount);
    }

    function redistributeFunds() internal {
        IERC20 lToken = lToken();
        uint256 fundsBalance = lToken.balanceOf(address(this));
        if (fundsBalance > defiSettings.maxInstantAmount){
            uint256 diff = fundsBalance - defiSettings.minInstantAmount; //Safe because maxInstantAmount >= minInstantAmount
            require(lToken.transfer(address(defiModule()), diff), "DefiFundsModule: deposit to DefiModule failed");
            defiModule().handleDeposit(address(this), diff);
        } else if (fundsBalance < defiSettings.minInstantAmount) {
            uint256 diff = defiSettings.minInstantAmount - fundsBalance;
            if (lBalance < defiSettings.minInstantAmount) {
                if (lBalance > fundsBalance) {
                    diff = lBalance - fundsBalance;
                } else {
                    return;
                }
            }
            defiModule().withdraw(address(this), diff);    
        }
    }

    function defiModule() private view returns(IDefiModule) {
        return IDefiModule(getModuleAddress(MODULE_DEFI));
    }
    
    function lToken() private view returns(IERC20){
        return IERC20(getModuleAddress(MODULE_LTOKEN));
    }


}