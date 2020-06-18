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

    function withdrawAllFromDefi(address token) public onlyFundsOperator {
        uint256 amount = defiModule().poolBalance(token);
        defiModule().withdraw(token, address(this), amount);
    }

    function depositAllToDefi(address token) public onlyFundsOperator {
        uint256 amount = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(address(defiModule()), amount);
        defiModule().handleDeposit(token, address(this), amount);
    }

    function lTransferToFunds(address token, address from, uint256 amount) internal {
        require(IERC20(token).transferFrom(from, address(defiModule()), amount), "DefiFundsModule: incoming transfer failed");
        defiModule().handleDeposit(token, from, amount);
    }

    function lTransferFromFunds(address token, address to, uint256 amount) internal {
        defiModule().withdraw(token, to, amount);
    }

    function defiModule() private view returns(IDefiModule) {
        return IDefiModule(getModuleAddress(MODULE_DEFI));
    }
    
}