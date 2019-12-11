pragma solidity ^0.5.12;

/**
 * @title Bonding Curve Interface
 * @dev A bonding curve is a method for continous token minting / burning.
 */
interface ICurveModule {
    /**
     * @notice Calculates amount of pTokens to mint
     * @param liquidAssets Liquid assets in Pool
     * @param debtCommitments Debt commitments
     * @param amount Amount of liquidTokens to deposit
     * @return Amount of pTokens to mint/unlock
     */
    function calculateEnter(uint256 liquidAssets, uint256 debtCommitments, uint256 amount) external view returns (uint256);

    /**
     * @notice Calculates amount of pTokens which should be burned/locked when liquidity removed from pool
     * @param liquidAssets Liquid assets in Pool
     * @param amount Amount of pTokens to withdraw
     * @return Amount of pTokens to burn/lock
     */
    function calculateExit(uint256 liquidAssets, uint256 amount) external view returns (uint256);


    /**
     * @notice Calculates amount of pTokens which should be burned/locked when liquidity removed from pool
     * @param liquidAssets Liquid assets in Pool
     * @param amount Amount of liquid tokens to withdraw
     * @return Amount of pTokens to burn/lock
     */
    function calculateExitByLiquidToken(uint256 liquidAssets, uint256 amount) external view returns (uint256);
}