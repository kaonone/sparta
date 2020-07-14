pragma solidity ^0.5.12;

interface IDefiProtocol {
    /**
     * @notice Transfer tokens from sender to DeFi protocol
     * @param token Address of token
     * @param amount Value of token to deposit
     * @return new balances of each token
     */
    function deposit(address token, uint256 amount) external;

    /**
     * @notice Transfer tokens from DeFi protocol to beneficiary
     * @param token Address of token
     * @param amount Value of token to deposit
     * @return new balances of each token
     */
    function withdraw(address beneficiary, address token, uint256 amount) external;

    /**
     * @notice Transfer tokens from DeFi protocol to beneficiary
     * @param amounts Array of amounts to withdraw, in order of supportedTokens()
     * @return new balances of each token
     */
    function withdraw(address beneficiary, uint256[] calldata amounts) external;

    /**
     * @dev This function is not view because on some protocols 
     * (Compound, RAY with Compound oportunity) it may cause storage writes
     */
    function balanceOf(address token) external returns(uint256);

    /**
     * @notice Balance of all tokens supported by protocol 
     * @dev This function is not view because on some protocols 
     * (Compound, RAY with Compound oportunity) it may cause storage writes
     */
    function balanceOfAll() external returns(uint256[] memory); 

    function supportedTokens() external view returns(address[] memory);

}