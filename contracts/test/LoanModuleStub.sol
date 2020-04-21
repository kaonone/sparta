pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "../interfaces/curve/IFundsModule.sol";
import "../interfaces/curve/ILoanModule.sol";
import "../interfaces/curve/ILoanProposalsModule.sol";
import "../token/pTokens/PToken.sol";
import "../common/Module.sol";

/**
 * @notice
 * Stub of LoanModule to allow tests of FundsModule and LiquidityModule
 */
contract LoanModuleStub is Module, ILoanModule, ILoanProposalsModule {
    uint256 private lDebts;
    mapping (address=>bool) hasDebts;

    function initialize(address _pool) public initializer {
        Module.initialize(_pool);
    }

    function createDebtProposal(uint256 debtLAmount, uint256, uint256, bytes32) public returns(uint256){
        lDebts = debtLAmount;
    }

    function addPledge(address, uint256, uint256, uint256) public {
        this; // silence state mutability warning
    }

    function withdrawPledge(address, uint256, uint256) public {
        this; // silence state mutability warning
    }

    function executeDebtProposal(uint256) public returns(uint256){
        hasDebts[_msgSender()] = true;
    }

    function createDebt(address, uint256, uint256) public returns(uint256){
        hasDebts[_msgSender()] = true;
    }

    function repay(uint256, uint256) public {
        hasDebts[_msgSender()] = false;
    }

    function repayPTK(uint256, uint256, uint256) public {
        hasDebts[_msgSender()] = false;
    }

    function repayAllInterest(address) public {
        this; // silence state mutability warning
    }

    function executeDebtDefault(address, uint256) public {
        this; // silence state mutability warning
    }

    function withdrawUnlockedPledge(address, uint256) public {
        lDebts = lDebts; // silence state mutability warning
    }

    function calculatePledgeInfo(address, uint256, address) view public 
    returns(uint256, uint256, uint256, uint256){
        this; // silence state mutability warning
        return (0, 0, 0, 0);
    }

    function getRequiredPledge(address, uint256) view public returns(uint256){
        this; // silence state mutability warning
        return 0;
    }

    function getProposalAndPledgeInfo(address, uint256, address) public view
    returns(uint256 lAmount, uint256 lCovered, uint256 pCollected, uint256 interest, uint256 lPledge, uint256 pPledge) {
        return (0, 0, 0, 0, 0, 0);
    }

    function getProposalInterestRate(address, uint256) public view returns(uint256){
        return 0;
    }

    function getDebtRequiredPayments(address, uint256) public view returns(uint256, uint256) {
        this; // silence state mutability warning
        return (0, 0);
    }

    function isDebtDefaultTimeReached(address, uint256) view public returns(bool){
        return false;
    }

    function hasActiveDebts(address sender) public view returns(bool) {
        return hasDebts[sender];
    }

    function totalLDebts() public view returns(uint256){
        return lDebts;
    }

    function totalLProposals() public view returns(uint256) {
        return 0;
    }

    function totalLDebtsAndProposals() public view returns(uint256) {
        return lDebts;
    }

    function calculateInterestPayment(uint256, uint256, uint256, uint) public pure returns(uint256){
        return 0;
    }


}