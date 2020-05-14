pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "../../interfaces/flashloans/IFlashLoansModule.sol";
import "../../interfaces/flashloans/IFlashLoanReceiver.sol";
import "../../interfaces/curve/IFundsModule.sol";
import "../../common/Module.sol";

//solhint-disable func-order
contract FlashLoansModule is Module, IFlashLoansModule {
    using SafeMath for uint256;

    uint256 public constant LOAN_FEE_MULTIPLIER = 1e18;
    uint256 loanFee;        // Loan fee will be calculated as loanAmount*loanFee/LOAN_FEE_MULTIPLIER

    function initialize(address _pool) public initializer {
        Module.initialize(_pool);
        loanFee = LOAN_FEE_MULTIPLIER*1/1000;   // 0.1% fee
    }

    /**
     * @notice Execute flash loan
     * @param receiver A contract which receives flash loan
     * @param amount Amount of lToken to send to receiever
     */
    function executeLoan(IFlashLoanReceiver receiver, uint256 amount, bytes calldata data) external {
        uint256 fee = getLoanFee(amount);
        require(fee > 0, "FlashLoansModule: loan amount is too small");
        IFundsModule fundsModule = fundsModule();
        require(fundsModule.lBalance() >= amount, "FlashLoansModule: not enough liquidity");
        IERC20 lToken = lToken();
        uint256 balance = lToken.balanceOf(address(this));
        require(balance == 0, "FlashLoansModule: invalid state");

        // Transfer tokens to receiver
        fundsModule.withdrawLTokens(address(receiver), amount, 0);

        // Execute flash-loan
        receiver.executeOperation(address(lToken), amount, fee, data); 

        // Validate & return funds
        balance = lToken.balanceOf(address(this));
        require(balance == amount.add(fee), "FlashLoansModule: returned amount is not correct");
        lToken.approve(address(fundsModule), balance);
        fundsModule.depositLTokens(address(this), balance);

    }

    function setFee(uint256 _loanFee) public onlyOwner{
        loanFee = _loanFee;
    }

    function getLoanFee() public view returns(uint256){
        return loanFee;
    }

    function getLoanFee(uint256 amount) public view returns(uint256){
        return amount.mul(loanFee).div(LOAN_FEE_MULTIPLIER);
    }

    function fundsModule() internal view returns(IFundsModule) {
        return IFundsModule(getModuleAddress(MODULE_FUNDS));
    }
    
    function lToken() private view returns(IERC20){
        return IERC20(getModuleAddress(MODULE_LTOKEN));
    }
}