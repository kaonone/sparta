pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "../../interfaces/curve/ICurveModule.sol";
import "../../interfaces/curve/IFundsModule.sol";
import "../../interfaces/curve/ILoanModule.sol";
import "../../interfaces/curve/ILoanProposalsModule.sol";
import "../../interfaces/token/IPToken.sol";
import "../../common/Module.sol";
import "./FundsOperatorRole.sol";

//solhint-disable func-order
contract BaseFundsModule is Module, IFundsModule, FundsOperatorRole {
    using SafeMath for uint256;
    uint256 private constant MULTIPLIER = 1e18; // Price rate multiplier
    uint256 private constant STATUS_PRICE_AMOUNT = 10**18;  // Used to calculate price for Status event, should represent 1 DAI

    struct LTokenData {
        uint256 rate;       // Rate of the target token value to 1 USD, multiplied by MULTIPLIER. For DAI = 1e18, for USDC (6 decimals) = 1e30
        uint256 balance;    // Amount of this tokens on Pool balance
    }

    uint256 public lBalance;                // Tracked balance (normalized value)
    mapping(address=>uint256) pBalances;    // Stores how many pTokens is locked in FundsModule by user
    address[] public registeredLTokens;     // Array of registered LTokens (oreder is not significant and may change during removals)
    mapping(address=>LTokenData) public lTokens;   // Info about supported lTokens and their balances in Pool

    function initialize(address _pool) public initializer {
        Module.initialize(_pool);
        FundsOperatorRole.initialize(_msgSender());
        //lBalance = lToken.balanceOf(address(this)); //We do not initialize lBalance to preserve it's previous value when updgrade
    }

    /**
     * @notice Deposit liquid tokens to the pool
     * @param from Address of the user, who sends tokens. Should have enough allowance.
     * @param dnlAmount Amount of tokens to deposit
     */
    function depositLTokens(address token, address from, uint256 dnlAmount) public onlyFundsOperator {
        uint256 amount = normalizeLTokenValue(token, dnlAmount);
        lBalance = lBalance.add(amount);
        lTransferToFunds(token, from, dnlAmount);
        emitStatus();
    }

    /**
     * @notice Withdraw liquid tokens from the pool
     * @param to Address of the user, who sends tokens. Should have enough allowance.
     * @param amount Amount of tokens to deposit
     */
    function withdrawLTokens(address to, uint256 amount) public onlyFundsOperator {
        withdrawLTokens(address(0), to, amount, 0);
    }

    /**
     * @notice Withdraw liquid tokens from the pool
     * @param token Address of the token (fee may be paid by user for conversions) or 0 to withdraw in all tokens without fee
     * @param to Address of the user, who sends tokens. Should have enough allowance.
     * @param dnlAmount Amount of tokens to deposit
     * @param dnPoolFee Pool fee will be sent to pool owner
     */
    function withdrawLTokens(address token, address to, uint256 dnlAmount, uint256 dnPoolFee) public onlyFundsOperator {
        uint256 amount = normalizeLTokenValue(token, dnlAmount);
        if (amount > 0) { //This will be false for "fee only" withdrawal in LiquidityModule.withdrawForRepay()
            lBalance = lBalance.sub(amount);
            lTransferFromFunds(token, to, dnlAmount);
        }
        if (dnPoolFee > 0) {
            uint256 poolFee = normalizeLTokenValue(token, dnPoolFee);
            lBalance = lBalance.sub(poolFee);
            lTransferFromFunds(address(0), owner(), poolFee);
        }
        emitStatus();
    }

    /**
     * @notice Deposit pool tokens to the pool
     * @param from Address of the user, who sends tokens. Should have enough allowance.
     * @param amount Amount of tokens to deposit
     */
    function depositPTokens(address from, uint256 amount) public onlyFundsOperator {
        require(pToken().transferFrom(from, address(this), amount), "FundsModule: deposit failed"); //this also runs claimDistributions(from)
        pBalances[from] = pBalances[from].add(amount);
    }

    /**
     * @notice Withdraw pool tokens from the pool
     * @param to Address of the user, who receivs tokens.
     * @param amount Amount of tokens to deposit
     */
    function withdrawPTokens(address to, uint256 amount) public onlyFundsOperator {
        require(pToken().transfer(to, amount), "BaseFundsModule: withdraw failed");  //this also runs claimDistributions(to)
        pBalances[to] = pBalances[to].sub(amount);
    }

    /**
     * @notice Mint new PTokens
     * @param to Address of the user, who sends tokens.
     * @param amount Amount of tokens to mint
     */
    function mintPTokens(address to, uint256 amount) public onlyFundsOperator {
        assert(to != address(this)); //Use mintAndLockPTokens
        require(pToken().mint(to, amount), "BaseFundsModule: mint failed");
    }

    function distributePTokens(uint256 amount) public onlyFundsOperator {
        pToken().distribute(amount);    // This call will eventually mint new pTokens (with next distribution, which should be once a day)
    }
    
    /**
     * @notice Burn pool tokens
     * @param from Address of the user, whos tokens we burning. Should have enough allowance.
     * @param amount Amount of tokens to burn
     */
    function burnPTokens(address from, uint256 amount) public onlyFundsOperator {
        assert(from != address(this)); //Use burnLockedPTokens
        pToken().burnFrom(from, amount); // This call will revert if sender has not enough pTokens. Allowance is always unlimited for FundsModule
    }

    /**
     * @notice Lock pTokens for a loan
     * @param from list of addresses to lock tokens from
     * @param amount list of amounts addresses to lock tokens from
     */
    function lockPTokens(address[] calldata from, uint256[] calldata amount) external onlyFundsOperator {
        require(from.length == amount.length, "BaseFundsModule: from and amount length should match");
        //pToken().claimDistributions(address(this));
        pToken().claimDistributions(from);
        uint256 lockAmount;
        for (uint256 i=0; i < from.length; i++) {
            address account = from[i];
            pBalances[account] = pBalances[account].sub(amount[i]);                
            lockAmount = lockAmount.add(amount[i]);
        }
        pBalances[address(this)] = pBalances[address(this)].add(lockAmount);
    }

    function mintAndLockPTokens(uint256 amount) public onlyFundsOperator {
        require(pToken().mint(address(this), amount), "BaseFundsModule: mint failed");
        pBalances[address(this)] = pBalances[address(this)].add(amount);
    }

    function unlockAndWithdrawPTokens(address to, uint256 amount) public onlyFundsOperator {
        require(pToken().transfer(to, amount), "BaseFundsModule: withdraw failed"); //this also runs claimDistributions(to)
        pBalances[address(this)] = pBalances[address(this)].sub(amount);
    }

    function burnLockedPTokens(uint256 amount) public onlyFundsOperator {
        pToken().burn(amount); //This call will revert if something goes wrong
        pBalances[address(this)] = pBalances[address(this)].sub(amount);
    }

    function registerLToken(address lToken, uint256 rate) public onlyOwner {
        require(rate != 0, "BaseFundsModule: bad rate");
        require(lTokens[lToken].rate == 0, "BaseFundsModule: already registered");
        registeredLTokens.push(lToken);
        lTokens[lToken] = LTokenData({rate: rate, balance: 0});
        emit LTokenRegistered(lToken, rate);
    }

    function unregisterLToken(address lToken) public onlyOwner {
        require(lTokens[lToken].rate != 0, "BaseFundsModule: token not registered");
        uint256 pos;
        //Find position of token we are removing
        for (pos = 0; pos < registeredLTokens.length; pos++) {
            if (registeredLTokens[pos] == lToken) break;
        }
        assert(registeredLTokens[pos] == lToken); // This should never fail because we know token is registered
        if (pos == registeredLTokens.length - 1) {
            // Removing last token
            registeredLTokens.pop();
        } else {
            // Replace token we are going to delete with the last one and remove it
            address last = registeredLTokens[registeredLTokens.length-1];
            registeredLTokens.pop();
            registeredLTokens[pos] = last;
        }
        emit LTokenUnregistered(lToken);
    }

    function setLTokenRate(address lToken, uint256 rate) public onlyOwner {
        require(rate != 0, "BaseFundsModule: bad rate");
        require(lTokens[lToken].rate != 0, "BaseFundsModule: token not registered");
        uint256 oldRate = lTokens[lToken].rate;
        lTokens[lToken].rate = rate;
        emit LTokenRateChanged(lToken, oldRate, rate);
    }

    function allRegisteredLTokens() external view returns(address[] memory){
        address[] memory tokens = new address[](registeredLTokens.length);
        for (uint256 i = 0; i < registeredLTokens.length; i++) {
            tokens[i] = registeredLTokens[i];
        }
        return tokens;
    }

    /**
     * @notice Refund liquid tokens accidentially sent directly to this contract
     * @param to Address of the user, who receives refund
     * @param amount Amount of tokens to send
     */
    function refundLTokens(address lToken, address to, uint256 amount) public onlyOwner {
        uint256 realLBalance = IERC20(lToken).balanceOf(address(this));
        require(realLBalance.sub(amount) >= lTokens[lToken].balance, "BaseFundsModule: not enough tokens to refund");
        require(IERC20(lToken).transfer(to, amount), "BaseFundsModule: refund failed");
    }

    function emitStatusEvent() public onlyFundsOperator {
        emitStatus();
    }

    /**
     * @return Amount of pTokens locked in FundsModule by account
     */
    function pBalanceOf(address account) public view returns(uint256){
        return pBalances[account];
    }

    function isLTokenRegistered(address token) public view returns(bool) {
        return  lTokens[token].rate != 0;
    }

    function normalizeLTokenValue(address token, uint256 value) public view returns(uint256) {
        if (token == address(0)) return value;
        LTokenData storage data = lTokens[token];
        return value.mul(data.rate).div(MULTIPLIER);     
    }

    function denormalizeLTokenValue(address token, uint256 value) public view returns(uint256) {
        if (token == address(0)) return value;
        LTokenData storage data = lTokens[token];
        return value.mul(MULTIPLIER).div(data.rate);     
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

    function lTransferToFunds(address token, address from, uint256 dnlAmount) internal {
        require(IERC20(token).transferFrom(from, address(this), dnlAmount), "BaseFundsModule: incoming transfer failed");
    }

    function lTransferFromFunds(address token, address to, uint256 dnlAmount) internal {
        if (token == address(0)) {
            token = getPrefferableTokenForWithdraw(dnlAmount);
        }
        require(IERC20(token).transfer(to, dnlAmount), "BaseFundsModule: outgoing transfer failed");
    }

    function getPrefferableTokenForWithdraw(uint256 lAmount) internal view returns(address){
        //Use simplest strategy: return first one with enough liquitdity
        for (uint256 i = 0; i < registeredLTokens.length; i++) {
            uint256 balance = IERC20(registeredLTokens[i]).balanceOf(address(this));
            if (balance > lAmount) return registeredLTokens[i];
        }
        //If not found, just return first one
        return registeredLTokens[0];
    }

    function emitStatus() private {
        uint256 lDebts = loanModule().totalLDebts();
        uint256 lProposals = loanProposalsModule().totalLProposals();
        uint256 pEnterPrice = curveModule().calculateEnter(lBalance, lDebts, STATUS_PRICE_AMOUNT);
        uint256 pExitPrice; // = 0; //0 is default value
        if (lBalance >= STATUS_PRICE_AMOUNT) {
            pExitPrice = curveModule().calculateExit(lBalance.sub(lProposals), STATUS_PRICE_AMOUNT);
        } else {
            pExitPrice = 0;
        }
        emit Status(lBalance, lDebts, lProposals, pEnterPrice, pExitPrice);
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

    function pToken() private view returns(IPToken){
        return IPToken(getModuleAddress(MODULE_PTOKEN));
    }
    
}
