pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "../../interfaces/curve/ICurveModule.sol";
import "../../interfaces/curve/IFundsModule.sol";
import "../../interfaces/curve/ILoanModule.sol";
import "../../token/pTokens/PToken.sol";
import "../../common/Module.sol";
import "./FundsOperatorRole.sol";

contract FundsModule is Module, IFundsModule, FundsOperatorRole {
    using SafeMath for uint256;
    uint256 private constant STATUS_PRICE_AMOUNT = 10**18;  // Used to calculate price for Status event, should represent 1 DAI

    IERC20 public lToken;       //Address of liquid token
    PToken public pToken;       //Address of PToken
    uint256 public lBalance;    //Tracked balance of liquid token, may be less or equal to lToken.balanceOf(address(this))

    function initialize(address _pool, IERC20 _lToken, PToken _pToken) public initializer {
        Module.initialize(_pool);
        FundsOperatorRole.initialize(_msgSender());
        lToken = _lToken;
        pToken = _pToken;
        //lBalance = lToken.balanceOf(address(this)); //We do not initialize lBalance to preserve it's previous value when updgrade
    }

    /**
     * @notice Deposit liquid tokens to the pool
     * @param from Address of the user, who sends tokens. Should have enough allowance.
     * @param amount Amount of tokens to deposit
     */
    function depositLTokens(address from, uint256 amount) public onlyFundsOperator {
        lBalance = lBalance.add(amount);
        require(lToken.transferFrom(from, address(this), amount), "FundsModule: deposit failed");
        emitStatus();
    }

    /**
     * @notice Withdraw liquid tokens from the pool
     * @param to Address of the user, who sends tokens. Should have enough allowance.
     * @param amount Amount of tokens to deposit
     */
    function withdrawLTokens(address to, uint256 amount) public onlyFundsOperator {
        withdrawLTokens(to, amount, 0);
    }

    /**
     * @notice Withdraw liquid tokens from the pool
     * @param to Address of the user, who sends tokens. Should have enough allowance.
     * @param amount Amount of tokens to deposit
     * @param poolFee Pool fee will be sent to pool owner
     */
    function withdrawLTokens(address to, uint256 amount, uint256 poolFee) public onlyFundsOperator {
        lBalance = lBalance.sub(amount);
        require(lToken.transfer(to, amount), "FundsModule: withdraw failed");
        if (poolFee > 0) {
            lBalance = lBalance.sub(poolFee);
            require(lToken.transfer(owner(), poolFee), "FundsModule: fee transfer failed");
        }
        emitStatus();
    }

    /**
     * @notice Deposit pool tokens to the pool
     * @param from Address of the user, who sends tokens. Should have enough allowance.
     * @param amount Amount of tokens to deposit
     */
    function depositPTokens(address from, uint256 amount) public onlyFundsOperator {
        require(pToken.transferFrom(from, address(this), amount), "FundsModule: deposit failed");
    }

    /**
     * @notice Withdraw pool tokens from the pool
     * @param to Address of the user, who receivs tokens.
     * @param amount Amount of tokens to deposit
     */
    function withdrawPTokens(address to, uint256 amount) public onlyFundsOperator {
        require(pToken.transfer(to, amount), "FundsModule: withdraw failed");
    }

    /**
     * @notice Mint new PTokens
     * @param to Address of the user, who sends tokens.
     * @param amount Amount of tokens to mint
     */
    function mintPTokens(address to, uint256 amount) public onlyFundsOperator {
        require(pToken.mint(to, amount), "FundsModule: mint failed");
    }

    /**
     * @notice Burn pool tokens
     * @param from Address of the user, whos tokens we burning. Should have enough allowance.
     * @param amount Amount of tokens to burn
     */
    function burnPTokens(address from, uint256 amount) public onlyFundsOperator {
        pToken.burnFrom(from, amount); //This call will revert if we have not enough allowance or sender has not enough pTokens
    }

    /**
     * @notice Refund liquid tokens accidentially sent directly to this contract
     * @param to Address of the user, who receives refund
     * @param amount Amount of tokens to send
     */
    function refundLTokens(address to, uint256 amount) public onlyFundsOperator {
        uint256 realLBalance = lToken.balanceOf(address(this));
        require(realLBalance.sub(amount) >= lBalance, "FundsModule: not enough tokens to refund");
        require(lToken.transfer(to, amount), "FundsModule: refund failed");
    }

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
     * @notice Calculates how many pTokens should be taken from user for decreasing liquidity
     * @param lAmount Amount of liquid tokens which will be removed from the pool
     * @return Amount of pToken which should be taken from sender
     */
    function calculatePoolExit(uint256 lAmount) public view returns(uint256) {
        return curveModule().calculateExit(lBalance, lAmount);
    }

    /**
     * @notice Calculates how many liquid tokens should be removed from pool when decreasing liquidity
     * @param pAmount Amount of pToken which should be taken from sender
     * @return Amount of liquid tokens which will be removed from the pool: total, part for sender, part for pool
     */
    function calculatePoolExitInverse(uint256 pAmount) public view returns(uint256, uint256, uint256) {
        return curveModule().calculateExitInverse(lBalance, pAmount);
    }

    function emitStatus() private {
        uint256 lDebts = loanModule().totalLDebts();
        uint256 pEnterPrice = curveModule().calculateEnter(lBalance, lDebts, STATUS_PRICE_AMOUNT);
        uint256 pExitPrice = curveModule().calculateExit(lBalance, STATUS_PRICE_AMOUNT);
        emit Status(lBalance, lDebts, pEnterPrice, pExitPrice);
    }

    function curveModule() private view returns(ICurveModule) {
        return ICurveModule(getModuleAddress(MODULE_CURVE));
    }
    
    function loanModule() private view returns(ILoanModule) {
        return ILoanModule(getModuleAddress(MODULE_LOAN));
    }

}