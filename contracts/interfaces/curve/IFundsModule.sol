pragma solidity ^0.5.12;

/**
 * @title Funds Module Interface
 * @dev Funds module is responsible for token transfers, provides info about current liquidity/debts and pool token price.
 */
interface IFundsModule {
    event Status(uint256 lBalance, uint256 lDebts, uint256 lProposals, uint256 pEnterPrice, uint256 pExitPrice);
    event LTokenRegistered(address indexed token, uint256 rate);
    event LTokenUnregistered(address indexed token);
    event LTokenRateChanged(address indexed token, uint256 oldRate, uint256 newRate);


    function registerLToken(address lToken, uint256 rate) external;

    function unregisterLToken(address lToken) external;

    /**
     * @notice Deposit liquid tokens to the pool
     * @param from Address of the user, who sends tokens. Should have enough allowance.
     * @param amount Amount of tokens to deposit
     */
    function depositLTokens(address token, address from, uint256 amount) external;
    /**
     * @notice Withdraw liquid tokens from the pool
     * @param to Address of the user, who sends tokens. Should have enough allowance.
     * @param amount Amount of tokens to deposit
     */
    function withdrawLTokens(address to, uint256 amount) external;

    /**
     * @notice Withdraw liquid tokens from the pool
     * @param to Address of the user, who sends tokens. Should have enough allowance.
     * @param amount Amount of tokens to deposit
     * @param poolFee Pool fee will be sent to pool owner
     */
    function withdrawLTokens(address to, uint256 amount, uint256 poolFee) external;

    /**
     * @notice Deposit pool tokens to the pool
     * @param from Address of the user, who sends tokens. Should have enough allowance.
     * @param amount Amount of tokens to deposit
     */
    function depositPTokens(address from, uint256 amount) external;

    /*
     * @notice Withdraw pool tokens from the pool
     * @param to Address of the user, who sends tokens. Should have enough allowance.
     * @param amount Amount of tokens to deposit
     */
    function withdrawPTokens(address to, uint256 amount) external;

    /**
     * @notice Mint new PTokens
     * @param to Address of the user, who sends tokens.
     * @param amount Amount of tokens to mint
     */
    function mintPTokens(address to, uint256 amount) external;

    /**
     * @notice Mint new PTokens and distribute the to other PToken holders
     * @param amount Amount of tokens to mint
     */
    function distributePTokens(uint256 amount) external;

    /**
     * @notice Burn pool tokens
     * @param from Address of the user, whos tokens we burning. Should have enough allowance.
     * @param amount Amount of tokens to burn
     */
    function burnPTokens(address from, uint256 amount) external;

    function lockPTokens(address[] calldata from, uint256[] calldata amount) external;

    function mintAndLockPTokens(uint256 amount) external;

    function unlockAndWithdrawPTokens(address to, uint256 amount) external;

    function burnLockedPTokens(uint256 amount) external;

    function emitStatusEvent() external;

    function lBalance(address token) external view returns(uint256);

    function allRegisteredLTokens() external view returns(address[] memory);
    
    function isLTokenRegistered(address token) external view returns(bool);

    function normalizeLTokenValue(address token, uint256 value) external view returns(uint256);

    function denormalizeLTokenValue(address token, uint256 value) external view returns(uint256);

    /**
     * @notice Calculates how many pTokens should be given to user for increasing liquidity
     * @param lAmount Amount of liquid tokens which will be put into the pool
     * @return Amount of pToken which should be sent to sender
     */
    function calculatePoolEnter(uint256 lAmount) external view returns(uint256);

    /**
     * @notice Calculates how many pTokens should be given to user for increasing liquidity
     * @param lAmount Amount of liquid tokens which will be put into the pool
     * @param liquidityCorrection Amount of liquid tokens to remove from liquidity because it was "virtually" withdrawn
     * @return Amount of pToken which should be sent to sender
     */
    function calculatePoolEnter(uint256 lAmount, uint256 liquidityCorrection) external view returns(uint256);
    
    /**
     * @notice Calculates how many pTokens should be taken from user for decreasing liquidity
     * @param lAmount Amount of liquid tokens which will be removed from the pool
     * @return Amount of pToken which should be taken from sender
     */
    function calculatePoolExit(uint256 lAmount) external view returns(uint256);

    /**
     * @notice Calculates how many liquid tokens should be removed from pool when decreasing liquidity
     * @param pAmount Amount of pToken which should be taken from sender
     * @return Amount of liquid tokens which will be removed from the pool: total, part for sender, part for pool
     */
    function calculatePoolExitInverse(uint256 pAmount) external view returns(uint256, uint256, uint256);

    /**
     * @notice Calculates how many pTokens should be taken from user for decreasing liquidity
     * @param lAmount Amount of liquid tokens which will be removed from the pool
     * @return Amount of pToken which should be taken from sender
     */
    function calculatePoolExitWithFee(uint256 lAmount) external view returns(uint256);

    /**
     * @notice Calculates amount of pTokens which should be burned/locked when liquidity removed from pool
     * @param lAmount Amount of liquid tokens beeing withdrawn. Does NOT include part for pool
     * @param liquidityCorrection Amount of liquid tokens to remove from liquidity because it was "virtually" withdrawn
     * @return Amount of pTokens to burn/lock
     */
    function calculatePoolExitWithFee(uint256 lAmount, uint256 liquidityCorrection) external view returns(uint256);


   /**
     * @notice Current pool liquidity
     * @return available liquidity
     */
    function lBalance() external view returns(uint256);

    /**
     * @return Amount of pTokens locked in FundsModule by account
     */
    function pBalanceOf(address account) external view returns(uint256);

}