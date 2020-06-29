pragma solidity ^0.5.12;

contract ICurveFiSwap { 
    function add_liquidity (uint256[3] calldata amounts, uint256 min_mint_amount) external;
    function remove_liquidity (uint256 _amount, uint256[3] calldata min_amounts) external;
    function remove_liquidity_imbalance (uint256[3] calldata amounts, uint256 max_burn_amount) external;
    function balances(int128 i) external view returns(uint256);
    function A() external view returns(uint256);
    function fee() external view returns(uint256);
    function owner() external view returns(address);

}