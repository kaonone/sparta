pragma solidity ^0.5.12;

//solhint-disable func-order
interface IDefiModule { 
    event Deposit(uint256 amount);
    event Withdraw(uint256 amount);
    event InvestmentDistributionCreated(uint256 amount, uint256 currentBalance, uint256 distributedPTK);

    //Info
    function poolBalance() external returns(uint256);

    // Actions for user
    function createDistributionIfReady() external;

    //Actions for DefiOperator (FundsModule)
    function handleDeposit(address sender, uint256 amount) external;
    function withdraw(address beneficiary, uint256 amount) external;
}