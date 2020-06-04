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
    function handleDeposit(address, address, uint256) external {
        this;
    }

    function withdraw(address, address, uint256) external {
        this;
    }

    function withdrawInterest() external {
        this;
    }

    function claimDistributions(address) external {
        this;
    }

    function claimDistributions(address, uint256) external {
        this;
    }

    function updatePTKBalance(address, uint256) external  {
        this;
    }

    function poolBalance() external returns(uint256) {
        this;
        return 0;
    }

    function availableInterest(address) external view returns(address[] memory tokens, uint256[] memory amounts) {
        tokens = new address[](0);
        amounts = new uint256[](0);
    }

}