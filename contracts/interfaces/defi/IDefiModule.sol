pragma solidity ^0.5.12;


contract IDefiModule { 
    //Info
    function poolBalance() external();
    function availableInterest(address account) external returns (uint256)

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