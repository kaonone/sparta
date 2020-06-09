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

    function initialize(address _pool) public initializer {
        BaseFundsModule.initialize(_pool);
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

    function lTransferToFunds(address from, uint256 amount) internal {
        require(lToken().transferFrom(from, address(defiModule()), amount), "DefiFundsModule: incoming transfer failed");
        defiModule().handleDeposit(from, amount);
    }

    function lTransferFromFunds(address to, uint256 amount) internal {
        defiModule().withdraw(to, amount);
    }

    function defiModule() private view returns(IDefiModule) {
        return IDefiModule(getModuleAddress(MODULE_DEFI));
    }
    
}