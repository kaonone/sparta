pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "../../interfaces/curve/IFundsModule.sol";
import "../../interfaces/curve/ILoanModule.sol";
import "../../interfaces/curve/ILiquidityModule.sol";
import "../../token/pTokens/PToken.sol";
import "../../common/Module.sol";

contract LiquidityModule is Module, ILiquidityModule {
    struct LiquidityLimits {
        uint256 lDepositMin;     // Minimal amount of liquid tokens for deposit
        uint256 pWithdrawMin;    // Minimal amount of pTokens for withdraw
    }

    LiquidityLimits public limits;

    function initialize(address _pool) public initializer {
        Module.initialize(_pool);
        setLimits(10*10**18, 0);    //10 DAI minimal enter
    }

    /*
     * @notice Deposit amount of lToken and mint pTokens
     * @param lAmount Amount of liquid tokens to invest
     * @param pAmountMin Minimal amout of pTokens suitable for sender
     */ 
    function deposit(uint256 lAmount, uint256 pAmountMin) public {
        require(lAmount > 0, "LiquidityModule: amount should not be 0");
        require(lAmount >= limits.lDepositMin, "LiquidityModule: amount should be >= lDepositMin");
        require(!loanModule().hasActiveDebts(_msgSender()), "LiquidityModule: Deposits forbidden if address has active debts");
        uint pAmount = fundsModule().calculatePoolEnter(lAmount);
        require(pAmount >= pAmountMin, "LiquidityModule: Minimal amount is too high");
        fundsModule().depositLTokens(_msgSender(), lAmount);
        fundsModule().mintPTokens(_msgSender(), pAmount);
        emit Deposit(_msgSender(), lAmount, pAmount);
    }

    /**
     * @notice Withdraw amount of lToken and burn pTokens
     * @param pAmount Amount of pTokens to send
     * @param lAmountMin Minimal amount of liquid tokens to withdraw
     */
    function withdraw(uint256 pAmount, uint256 lAmountMin) public {
        require(pAmount > 0, "LiquidityModule: amount should not be 0");
        require(pAmount >= limits.pWithdrawMin, "LiquidityModule: amount should be >= pWithdrawMin");
        require(!loanModule().hasActiveDebts(_msgSender()), "LiquidityModule: Withdraws forbidden if address has active debts");
        (uint256 lAmountT, uint256 lAmountU, uint256 lAmountP) = fundsModule().calculatePoolExitInverse(pAmount);
        require(lAmountU >= lAmountMin, "LiquidityModule: Minimal amount is too high");
        uint256 availableLiquidity = fundsModule().lBalance();
        require(lAmountT <= availableLiquidity, "LiquidityModule: not enough liquidity");
        fundsModule().burnPTokens(_msgSender(), pAmount);
        fundsModule().withdrawLTokens(_msgSender(), lAmountU, lAmountP);
        emit Withdraw(_msgSender(), lAmountT, lAmountU, pAmount);
    }

    function setLimits(uint256 lDepositMin, uint256 pWithdrawMin) public onlyOwner {
        limits.lDepositMin = lDepositMin;
        limits.pWithdrawMin = pWithdrawMin;
    }

    function fundsModule() internal view returns(IFundsModule) {
        return IFundsModule(getModuleAddress(MODULE_FUNDS));
    }

    function loanModule() internal view returns(ILoanModule) {
        return ILoanModule(getModuleAddress(MODULE_LOAN));
    }
}