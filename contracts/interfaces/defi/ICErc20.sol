pragma solidity ^0.5.12;

/**
 * Most important functions of Compound CErc20 token.
 * Source: https://github.com/compound-finance/compound-protocol/blob/master/contracts/CTokenInterfaces.sol
 *
 * Original interface name: CErc20Interface
 * but we use our naming covention.
 */
//solhint-disable func-order
contract ICErc20 { 


    /*** User Interface of CTokenInterface ***/

    function transfer(address dst, uint amount) external returns (bool);
    function transferFrom(address src, address dst, uint amount) external returns (bool);
    function approve(address spender, uint amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function balanceOf(address owner) external view returns (uint256);
    function balanceOfUnderlying(address owner) external returns (uint256);
    function exchangeRateCurrent() external returns (uint256);
    function exchangeRateStored() external view returns (uint256);
    function accrueInterest() external returns (uint256);

     /*** User Interface of CErc20Interface ***/

    function mint(uint mintAmount) external returns (uint256);
    function redeem(uint redeemTokens) external returns (uint256);
    function redeemUnderlying(uint redeemAmount) external returns (uint256);

}