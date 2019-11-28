pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "../../interfaces/curve/IFundsModule.sol";
import "../../interfaces/curve/ICurveModule.sol";
import "../../token/pTokens/PToken.sol";
import "../../common/Base.sol";

contract FundsModule is Base, IFundsModule {
    IERC20 public liquidToken;
    PToken public pToken;

    function initialize(address sender, IERC20 _liquidToken, PToken _pToken) public initializer {
        Base.initialize(sender);
        liquidToken = _liquidToken;
        pToken = _pToken;
    }

    /**
     * @notice Deposit amount of liquidToken and mint pTokens
     * @param sender Address of Capital provider
     * @param amount Amount of liquid tokens to invest
     */
    function deposit(address sender, uint256 amount) public {
    }

    /**
     * @notice Withdraw amount of liquidToken and burn pTokens
     * @param sender Address of Capital provider
     * @param amount Amount of liquid tokens to withdraw
     */
    function withdraw(address sender, uint256 amount) public {
    }

    /**
     * @notice Borrow amount of liquidToken and lock pTokens
     * @param sender Address of Borrower
     * @param amount Amount of liquid tokens to borrow
     */
    function borrow(address sender, uint256 amount) public {
    }

    /**
     * @notice Repay amount of liquidToken and unlock pTokens
     * @param sender Address of Borrower
     * @param amount Amount of liquid tokens to repay
     */
    function repay(address sender, uint256 amount) public {
    }

    function getTotalLiquidAssets() public view returns(uint256) {
        return 0;
    }

    function getTotalDebtCommitments() public view returns(uint256) {
        return 0;
    }

    function calculatePoolEnter(uint256 amount) internal returns(uint256) {
        ICurveModule curveModule = getCurveModule();
        uint256 liquidAssets = getTotalLiquidAssets();
        uint256 debtCommitments = getTotalDebtCommitments();
        return curveModule.calculateEnter(liquidAssets, debtCommitments, amount);
    }

    function calculatePoolExit(uint256 amount) internal returns(uint256) {
        ICurveModule curveModule = getCurveModule();
        uint256 liquidAssets = getTotalLiquidAssets();
        return curveModule.calculateExit(liquidAssets, amount);
    }

    function getCurveModule() private view returns(ICurveModule) {
        return ICurveModule(getModuleAddress("curve"));
    }
}