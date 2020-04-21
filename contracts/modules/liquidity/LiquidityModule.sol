pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "../../interfaces/access/IAccessModule.sol";
import "../../interfaces/curve/IFundsModule.sol";
import "../../interfaces/curve/ILoanModule.sol";
import "../../interfaces/curve/ILiquidityModule.sol";
import "../../common/Module.sol";

contract LiquidityModule is Module, ILiquidityModule {
    struct LiquidityLimits {
        uint256 lDepositMin;     // Minimal amount of liquid tokens for deposit
        uint256 pWithdrawMin;    // Minimal amount of pTokens for withdraw
    }

    LiquidityLimits public limits;

    modifier operationAllowed(IAccessModule.Operation operation) {
        IAccessModule am = IAccessModule(getModuleAddress(MODULE_ACCESS));
        require(am.isOperationAllowed(operation, _msgSender()), "LiquidityModule: operation not allowed");
        _;
    }

    function initialize(address _pool) public initializer {
        Module.initialize(_pool);
        setLimits(10*10**18, 0);    //10 DAI minimal enter
    }

    /**
     * @notice Deposit amount of lToken and mint pTokens
     * @param lAmount Amount of liquid tokens to invest
     * @param pAmountMin Minimal amout of pTokens suitable for sender
     */ 
    function deposit(uint256 lAmount, uint256 pAmountMin) public operationAllowed(IAccessModule.Operation.Deposit) {
        require(lAmount > 0, "LiquidityModule: lAmount should not be 0");
        require(lAmount >= limits.lDepositMin, "LiquidityModule: amount should be >= lDepositMin");
        uint pAmount = fundsModule().calculatePoolEnter(lAmount);
        require(pAmount >= pAmountMin, "LiquidityModule: Minimal amount is too high");
        fundsModule().depositLTokens(_msgSender(), lAmount);
        fundsModule().mintPTokens(_msgSender(), pAmount);
        emit Deposit(_msgSender(), lAmount, pAmount);
    }

    /**
     * @notice Withdraw amount of lToken and burn pTokens
     * @dev This operation also repays all interest on all debts
     * @param pAmount Amount of pTokens to send (this amount does not include pTokens used to pay interest)
     * @param lAmountMin Minimal amount of liquid tokens to withdraw
     */
    function withdraw(uint256 pAmount, uint256 lAmountMin) public operationAllowed(IAccessModule.Operation.Withdraw) {
        require(pAmount > 0, "LiquidityModule: pAmount should not be 0");
        require(pAmount >= limits.pWithdrawMin, "LiquidityModule: amount should be >= pWithdrawMin");
        loanModule().repayAllInterest(_msgSender());
        (uint256 lAmountT, uint256 lAmountU, uint256 lAmountP) = fundsModule().calculatePoolExitInverse(pAmount);
        require(lAmountU >= lAmountMin, "LiquidityModule: Minimal amount is too high");
        uint256 availableLiquidity = fundsModule().lBalance();
        require(lAmountT <= availableLiquidity, "LiquidityModule: not enough liquidity");
        fundsModule().burnPTokens(_msgSender(), pAmount);
        fundsModule().withdrawLTokens(_msgSender(), lAmountU, lAmountP);
        emit Withdraw(_msgSender(), lAmountT, lAmountU, pAmount);
    }

    /**
     * @notice Withdraw amount of lToken and burn pTokens
     * @param borrower Address of the borrower
     * @param pAmount Amount of pTokens to send
     */
    function withdrawForRepay(address borrower, uint256 pAmount) public {
        require(_msgSender() == getModuleAddress(MODULE_LOAN), "LiquidityModule: call only allowed from LoanModule");
        require(pAmount > 0, "LiquidityModule: pAmount should not be 0");
        //require(pAmount >= limits.pWithdrawMin, "LiquidityModule: amount should be >= pWithdrawMin"); //Limit disabled, because this is actually repay
        (uint256 lAmountT, uint256 lAmountU, uint256 lAmountP) = fundsModule().calculatePoolExitInverse(pAmount);
        uint256 availableLiquidity = fundsModule().lBalance();
        require(lAmountP <= availableLiquidity, "LiquidityModule: not enough liquidity");
        fundsModule().burnPTokens(borrower, pAmount);           //We just burn pTokens, withous sending lTokens to _msgSender()
        fundsModule().withdrawLTokens(borrower, 0, lAmountP);   //This call is required to send pool fee
        emit Withdraw(borrower, lAmountT, lAmountU, pAmount);
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