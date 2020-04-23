pragma solidity ^0.5.12;

//solhint-disable func-order
interface IDefiModule { 
    event Deposit(uint256 amount);
    event Withdraw(uint256 amount);
    event WithdrawInterest(address account, uint256 amount);
    event PTKBalanceUpdated(address account, uint256 amount);
    event InvestmentDistributionCreated(uint256 amount, uint256 currentBalance, uint256 totalShares);
    event InvestmentDistributionsClaimed(address account, uint256 shares, uint256 amount, uint256 fromDistribution, uint256 toDistribution);

    //Info
    function poolBalance() external returns(uint256);
    function availableInterest(address account) external view returns (uint256);

    // Actions for user
    function withdrawInterest() external;

    // Actions for user and/or DefiOperator
    function claimDistributions(address account) external; 
    function claimDistributions(address account, uint256 toDistribution) external;

    //Actions for DefiOperator (FundsModule)
    function deposit(address sender, uint256 amount) external;
    function withdraw(address beneficiary, uint256 amount) external;

    //Actions for DefiOperator (PToken)
    function updatePTKBalance(address account, uint256 ptkBalance) external;
}