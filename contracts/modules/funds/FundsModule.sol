pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "../../interfaces/curve/IFundsModule.sol";
import "../../interfaces/curve/ICurveModule.sol";
import "../../token/pTokens/PToken.sol";
import "../../common/Module.sol";

contract FundsModule is Module, IFundsModule {
    IERC20 public liquidToken;
    PToken public pToken;

    struct DebtProposal {
        uint256 amount; // Amount of proposed credit (in liquid token)
        mapping(address => uint256) pledges;    //Map of all user pledges (this value will not change after proposal )
    }

    struct PledgeAmount {
        bool initialized;   //If !initialized, we need first load amount from DebtProposal
        uint256 amount;     //Amount of pTokens stored by Funds for this pledge. Locked + unlocked. 
    }

    struct Debt {
        uint256 proposal;   // Index of DebtProposal in adress's proposal list
        uint256 amount;     // Current amount of debt (in liquid token). If 0 - debt is fully paid
        mapping(address => PledgeAmount) pledges; //Map of all tokens (pledges) stored (some may be unlocked) in this debt by users.
    }

    mapping(address=>DebtProposal[]) debtProposals;
    mapping(address=>Debt[]) debts;

    uint256 public totalDebts;  //Sum of all debts amounts

    function initialize(address sender, address _pool, IERC20 _liquidToken, PToken _pToken) public initializer {
        Module.initialize(sender, _pool);
        liquidToken = _liquidToken;
        pToken = _pToken;
    }

    /*
     * @notice Deposit amount of liquidToken and mint pTokens
     * @param amount Amount of liquid tokens to invest
     */ 
    function deposit(uint256 amount) public {
        require(!hasActiveDebts(_msgSender()), "FundsModule: Deposits forbidden if address has active debts");
        require(liquidToken.transferFrom(_msgSender(), address(this), amount), "FundsModule: Deposit of liquid token failed");
        uint pAmount = calculatePoolEnter(amount);
        require(pToken.mint(_msgSender(), pAmount), "FundsModule: Mint of pToken failed");
        emit Deposit(_msgSender(), amount, pAmount);
    }

    /**
     * @notice Withdraw amount of liquidToken and burn pTokens
     * @param amount Amount of liquid tokens to withdraw
     */
    function withdraw(uint256 amount) public {
        uint pAmount = calculatePoolExit(amount);
        pToken.burnFrom(_msgSender(), pAmount);   //This call will revert if we have not enough allowance or sender has not enough pTokens
        require(liquidToken.transferFrom(_msgSender(), address(this), amount), "FundsModule: Withdraw of liquid token failed");
        emit Withdraw(_msgSender(), amount, pAmount);
    }

    /**
     * @notice Create DebtProposal
     * @param amount Amount of liquid tokens to borrow
     * @return Index of created DebtProposal
     */
    function createDebtProposal(uint256 amount) public returns(uint256){
    }

    /**
     * @notice Execute DebtProposal
     * @dev Creates Debt using data of DebtProposal
     * @param proposal Index of DebtProposal
     * @return Index of created Debt
     */
    function executeDebtProposal(uint256 proposal) public returns(uint256){
    }

    /**
     * @notice Repay amount of liquidToken and unlock pTokens
     * @param amount Amount of liquid tokens to repay
     * @param debt Index of Debt
     */
    function repay(uint256 amount, uint256 debt) public {
    }

    function totalLiquidAssets() public view returns(uint256) {
        return liquidToken.balanceOf(address(this));
    }

    function hasActiveDebts(address sender) internal view returns(bool) {
        //TODO: iterating through all debts may be too expensive if there are a lot of closed debts. Need to test this and find solution
        Debt[] storage userDebts = debts[sender];
        for (uint256 i=0; i < userDebts.length; i++){
            if (userDebts[i].amount == 0) return true;
        }
        return false;
    }

    function calculatePoolEnter(uint256 amount) internal view returns(uint256) {
        return getCurveModule().calculateEnter(totalLiquidAssets(), totalDebts, amount);
    }

    function calculatePoolExit(uint256 amount) internal view returns(uint256) {
        return getCurveModule().calculateExit(totalLiquidAssets(), amount);
    }

    function getCurveModule() private view returns(ICurveModule) {
        return ICurveModule(getModuleAddress("curve"));
    }
}