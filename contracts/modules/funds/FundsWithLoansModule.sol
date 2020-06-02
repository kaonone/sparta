pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "../../interfaces/curve/ICurveModule.sol";
import "../../interfaces/curve/IFundsWithLoansModule.sol";
import "../../interfaces/curve/ILoanModule.sol";
import "../../interfaces/curve/ILoanProposalsModule.sol";
import "../../interfaces/token/IPToken.sol";
import "../../common/Module.sol";
import "./FundsOperatorRole.sol";
import "./BaseFundsModule.sol";

//solhint-disable func-order
contract FundsWithLoansModule is IFundsWithLoansModule, BaseFundsModule {

    /**
     * @notice Calculates how many pTokens should be given to user for increasing liquidity
     * @param lAmount Amount of liquid tokens which will be put into the pool
     * @return Amount of pToken which should be sent to sender
     */
    function calculatePoolEnter(uint256 lAmount) public view returns(uint256) {
        uint256 lDebts = loanModule().totalLDebts();
        return curveModule().calculateEnter(lBalance, lDebts, lAmount);
    }

    /**
     * @notice Calculates how many pTokens should be given to user for increasing liquidity
     * @param lAmount Amount of liquid tokens which will be put into the pool
     * @param liquidityCorrection Amount of liquid tokens to remove from liquidity because it was "virtually" withdrawn
     * @return Amount of pToken which should be sent to sender
     */
    function calculatePoolEnter(uint256 lAmount, uint256 liquidityCorrection) public view returns(uint256) {
        uint256 lDebts = loanModule().totalLDebts();
        return curveModule().calculateEnter(lBalance.sub(liquidityCorrection), lDebts, lAmount);
    }

    /**
     * @notice Calculates how many pTokens should be taken from user for decreasing liquidity
     * @param lAmount Amount of liquid tokens which will be removed from the pool
     * @return Amount of pToken which should be taken from sender
     */
    function calculatePoolExit(uint256 lAmount) public view returns(uint256) {
        uint256 lProposals = loanProposalsModule().totalLProposals();
        return curveModule().calculateExit(lBalance.sub(lProposals), lAmount);
    }

    /**
     * @notice Calculates amount of pTokens which should be burned/locked when liquidity removed from pool
     * @param lAmount Amount of liquid tokens beeing withdrawn. Does NOT include part for pool
     * @return Amount of pTokens to burn/lock
     */
    function calculatePoolExitWithFee(uint256 lAmount) public view returns(uint256) {
        uint256 lProposals = loanProposalsModule().totalLProposals();
        return curveModule().calculateExitWithFee(lBalance.sub(lProposals), lAmount);
    }

    /**
     * @notice Calculates amount of pTokens which should be burned/locked when liquidity removed from pool
     * @param lAmount Amount of liquid tokens beeing withdrawn. Does NOT include part for pool
     * @param liquidityCorrection Amount of liquid tokens to remove from liquidity because it was "virtually" withdrawn
     * @return Amount of pTokens to burn/lock
     */
    function calculatePoolExitWithFee(uint256 lAmount, uint256 liquidityCorrection) public view returns(uint256) {
        uint256 lProposals = loanProposalsModule().totalLProposals();
        return curveModule().calculateExitWithFee(lBalance.sub(liquidityCorrection).sub(lProposals), lAmount);
    }

    /**
     * @notice Calculates how many liquid tokens should be removed from pool when decreasing liquidity
     * @param pAmount Amount of pToken which should be taken from sender
     * @return Amount of liquid tokens which will be removed from the pool: total, part for sender, part for pool
     */
    function calculatePoolExitInverse(uint256 pAmount) public view returns(uint256, uint256, uint256) {
        uint256 lProposals = loanProposalsModule().totalLProposals();
        return curveModule().calculateExitInverseWithFee(lBalance.sub(lProposals), pAmount);
    }

    function curveModule() private view returns(ICurveModule) {
        return ICurveModule(getModuleAddress(MODULE_CURVE));
    }

    function loanModule() private view returns(ILoanModule) {
        return ILoanModule(getModuleAddress(MODULE_LOAN));
    }

    function loanProposalsModule() private view returns(ILoanProposalsModule) {
        return ILoanProposalsModule(getModuleAddress(MODULE_LOAN_PROPOSALS));
    }


}
