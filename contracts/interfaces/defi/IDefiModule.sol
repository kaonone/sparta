pragma solidity ^0.5.12;


contract IDefiModule { 
    function deposit(address sender, uint256 amount) external;
    function withdraw(address beneficiary, uint256 amount) external;
    function withdrawInterest() external;

    function updatePTKBalance(address account, uint256 ptkBalance) external;
}