pragma solidity ^0.5.12;

/**
 * Most important functions of Compound CErc20 token.
 * Source: https://github.com/compound-finance/compound-protocol/blob/master/contracts/CTokenInterfaces.sol
 *
 * Original interface name: CErc20Interface
 * but we use our naming covention.
 */
contract ICErc20 { 

     /*** User Interface ***/

    function mint(uint mintAmount) external returns (uint);
    function redeem(uint redeemTokens) external returns (uint);
    function redeemUnderlying(uint redeemAmount) external returns (uint);
    function borrow(uint borrowAmount) external returns (uint);
    function repayBorrow(uint repayAmount) external returns (uint);
    function repayBorrowBehalf(address borrower, uint repayAmount) external returns (uint);
    function liquidateBorrow(address borrower, uint repayAmount, address /*CTokenInterface*/ cTokenCollateral) external returns (uint);

}