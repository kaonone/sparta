pragma solidity ^0.5.12;

/**
 * @title Bonding Curve Interface
 * @dev A bonding curve is a method for continous token minting / burning.
 */
interface IBondingCurve {

    event CurvedMint(address indexed sender, uint256 amount, uint256 deposit);
    event CurvedBurn(address indexed sender, uint256 amount, uint256 reimbursement);

    function calculateCurveMint(uint256 amount)
        external
        view
        returns (uint256);

    function calculateCurveBurn(uint256 amount)
        external
        view
        returns (uint256);

    function calculatePurchase(
        uint256 _totalSupply,
        uint256 _poolBalance,
        uint256 _reserveRatio,
        uint256 _amount
    ) external pure returns (uint256);

    function calculateSale(
        uint256 _totalSupply,
        uint256 _poolBalance,
        uint256 _reserveRatio,
        uint256 _amount
    ) external pure returns (uint256);
}