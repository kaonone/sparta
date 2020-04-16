pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "../interfaces/curve/IFundsModule.sol";
import "../interfaces/curve/ILoanModule.sol";
import "../token/pTokens/PToken.sol";
import "../common/Module.sol";

/**
 * @notice
 * Stub of LoanModule to allow tests of FundsModule and LiquidityModule
 */
contract DefiModuleStub is Module, IDefiModule {
    function deposit(address, uint256) external {
        this;
    }

    function withdraw(address, uint256) external {
        this;
    }

    function withdrawInterest() external {
        this;
    }

    function updatePTKBalance(address, uint256) external  {
        this;
    }
}