pragma solidity ^0.5.12;

/**
 * Most important functions of Compound CErc20 token.
 * Source: https://github.com/compound-finance/compound-protocol/blob/master/contracts/CTokenInterfaces.sol
 *
 * Original interface name: CErc20Interface
 * but we use our naming covention.
 */
contract ICErc20 { 


    /*** User Interface of CTokenInterface ***/

    function transfer(address dst, uint amount) external returns (bool);
    function transferFrom(address src, address dst, uint amount) external returns (bool);
    function approve(address spender, uint amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint);
    function balanceOf(address owner) external view returns (uint);
    function balanceOfUnderlying(address owner) external returns (uint);
    function exchangeRateCurrent() public returns (uint);

     /*** User Interface of CErc20Interface ***/

    function mint(uint mintAmount) external returns (uint);
    function redeem(uint redeemTokens) external returns (uint);
    function redeemUnderlying(uint redeemAmount) external returns (uint);

}