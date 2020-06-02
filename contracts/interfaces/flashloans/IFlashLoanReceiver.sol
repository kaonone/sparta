pragma solidity ^0.5.0;

/**
 * @notice Interface for contracts receiving flash loans. 
 * Compatible with Aave flash loans, see 
 * https://github.com/aave/aave-protocol/blob/master/contracts/flashloan/interfaces/IFlashLoanReceiver.sol
 */
interface IFlashLoanReceiver {
    /**
     * @notice Execute flash-loan
     * @param token Address of loaned token
     * @param amount Amount loaned
     * @param fee Fee has to be returned alongside with amount
     * @param data Any parameters your contract may need, use ABI-encoded form to pass multiple parameteres
     *
     * @dev When Pool calls executeOperation(), it already transfered tokens to receiver contract.
     * It's receiver responcibility to transfer back (to msg.sender) amount+fee tokens.
     */
    function executeOperation(address token, uint256 amount, uint256 fee, bytes calldata data) external;
}