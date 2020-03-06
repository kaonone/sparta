pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Mintable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";

//solhint-disable func-order
contract DistributionToken is ERC20, ERC20Mintable {
    using SafeMath for uint256;

    event DistributionCreated(uint256 amount, uint256 totalSupply);
    event DistributionsClaimed(address account, uint256 amount, uint256 fromDistribution, uint256 toDistribution);

    struct Distribution {
        uint256 amount;         // Amount of tokens being distributed during the event
        uint256 totalSupply;    // Total supply before distribution
    }

    Distribution[] public distributions;                   // Array of all distributions
    mapping(address => uint256) public nextDistributions;  // Map account to first distribution not yet processed

    function distribute(uint256 amount) public onlyMinter {
        uint256 currentTotalSupply = distributionTotalSupply();
        distributions.push(Distribution({
            amount:amount,
            totalSupply: currentTotalSupply
        }));
        super._mint(address(this), amount); //Use super because we overloaded _mint in this contract and need old behaviour
        emit DistributionCreated(amount, currentTotalSupply);
    }

    function claimDistributions(address account) public returns(uint256) {
        return _updateUserBalance(account, distributions.length);
    }
    
    /**
     * @notice Claims distributions and allows to specify how many distributions to process.
     * This allows limit gas usage.
     * One can do this for others
     */
    function claimDistributions(address account, uint256 toDistribution) public returns(uint256) {
        require(toDistribution < distributions.length, "DistributionToken: lastDistribution too hight");
        require(nextDistributions[account] < toDistribution, "DistributionToken: no distributions to claim");
        return _updateUserBalance(account, toDistribution+1); //+1 is safe because we've already checked toDistribution < distributions.length
    }

    function claimDistributions(address[] calldata accounts) external {
        for (uint256 i=0; i < accounts.length; i++){
            _updateUserBalance(accounts[i], distributions.length);
        }
    }

    function claimDistributions(address[] calldata accounts, uint256 toDistribution) external {
        require(toDistribution < distributions.length, "DistributionToken: lastDistribution too hight");
        for (uint256 i=0; i < accounts.length; i++){
            _updateUserBalance(accounts[i], toDistribution);
        }
    }

    /**
     * @notice Full balance of account includes:
     * - balance of tokens account holds himself (0 for addresses of locking contracts)
     * - balance of tokens locked in contracts
     * - tokens not yet claimed from distributions
     */
    function fullBalanceOf(address account) public view returns(uint256){
        if (account == address(this)) return 0;  //Token itself only holds tokens for others
        uint256 distributionBalance = distributionBalanceOf(account);
        uint256 unclaimed = calculateClaimAmount(account);
        return distributionBalance.add(unclaimed);
    }

    /**
     * @notice How many tokens are not yet claimed from distributions
     * @param account Account to check
     * @return Amount of tokens available to claim
     */
    function calculateUnlcaimedDistributions(address account) public view returns(uint256) {
        return calculateClaimAmount(account);
    }

    /**
     * @notice Calculates amount of tokens distributed to inital amount between startDistribution and nextDistribution
     * @param fromDistribution index of first Distribution to start calculations
     * @param toDistribution index of distribuition next to the last processed
     * @param initialBalance amount of tokens before startDistribution
     * @return amount of tokens distributed
     */
    function calculateDistributedAmount(uint256 fromDistribution, uint256 toDistribution, uint256 initialBalance) public view returns(uint256) {
        require(fromDistribution < toDistribution, "DistributionToken: startDistribution is too high");
        require(toDistribution <= distributions.length, "DistributionToken: nextDistribution is too high");
        return _calculateDistributedAmount(fromDistribution, toDistribution, initialBalance);
    }

    function nextDistribution() public view returns(uint256){
        return distributions.length;
    }

    // Override functions that change user balance
    function _transfer(address sender, address recipient, uint256 amount) internal {
        _updateUserBalance(sender);
        _updateUserBalance(recipient);
        super._transfer(sender, recipient, amount);
    }

    function _mint(address account, uint256 amount) internal {
        _updateUserBalance(account);
        super._mint(account, amount);
    }
    
    function _burn(address account, uint256 amount) internal {
        _updateUserBalance(account);
        super._burn(account, amount);
    }

    function _updateUserBalance(address account) internal returns(uint256) {
        return _updateUserBalance(account, distributions.length);
    }

    function _updateUserBalance(address account, uint256 toDistribution) internal returns(uint256) {
        uint256 fromDistribution = nextDistributions[account];
        if (fromDistribution >= toDistribution) return 0;
        uint256 distributionAmount = calculateClaimAmount(account, toDistribution);
        nextDistributions[account] = toDistribution;
        super._transfer(address(this), account, distributionAmount);
        emit DistributionsClaimed(account, distributionAmount, fromDistribution, toDistribution);
        return distributionAmount;
    }

    /**
     * @notice Balance of account, which is counted for distributions
     * It only represents already distributed balance.
     * @dev This function should be overloaded to include balance of tokens stored in proposals
     */
    function distributionBalanceOf(address account) internal view returns(uint256) {
        return balanceOf(account);
    }

    /**
     * @notice Total supply which is counted for distributions
     * It only represents already distributed tokens
     * @dev This function should be overloaded to exclude tokens locked in loans
     */
    function distributionTotalSupply() internal view returns(uint256){
        return totalSupply();
    }

    /**
     * @notice Calculates amount of account's tokens to be claimed from distributions
     */
    function calculateClaimAmount(address account) internal view returns(uint256) {
        if (nextDistributions[account] >= distributions.length) return 0;
        return calculateClaimAmount(account, distributions.length);
    }

    function calculateClaimAmount(address account, uint256 toDistribution) internal view returns(uint256) {
        assert(toDistribution <= distributions.length);
        return _calculateDistributedAmount(nextDistributions[account], toDistribution, distributionBalanceOf(account));
    }

    function _calculateDistributedAmount(uint256 fromDistribution, uint256 toDistribution, uint256 initialBalance) internal view returns(uint256) {
        uint256 next = fromDistribution;
        uint256 balance = initialBalance;
        while (next < toDistribution) {
            uint256 da = balance.mul(distributions[next].amount).div(distributions[next].totalSupply);
            balance = balance.add(da);
            next++;
        }
        return balance.sub(initialBalance);
    }

}