pragma solidity ^0.5.12;

/**
 * Interface for special functions of testnet DAI used by Compound protocol
 * Rinkeby Compound DAI: 0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea
 */
//solhint-disable func-order
interface ITestnetCompoundDAI {
    /**
     * @notice Mints new Comound DAI to recipient
     */
    function allocateTo(address recipient, uint256 value) external;

    // ERC20
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}