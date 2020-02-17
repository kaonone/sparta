pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Mintable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";

contract DistributionToken is ERC20, ERC20Mintable {
    using SafeMath for uint256;

    event DistributionCreated(uint256 amount, uint256 totalSupply);
    event DistributionsClaimed(address account, uint256 amount, uint256 startDistribution, uint256 nextDistribution);

    struct Distribution {
        uint256 amount;         // Amount of tokens being distributed during the event
        uint256 totalSupply;    // Total supply before distribution
    }

    Distribution[] public distributions;                   // Array of all distributions
    mapping(address => uint256) public nextDistributions;  // Map account to first distribution not yet processed

    function distribute(uint256 amount) public onlyMinter {
        uint256 currentTotalSupply = totalSupply();
        distributions.push(Distribution({
            amount:amount,
            totalSupply: currentTotalSupply
        }));
        super._mint(address(this), amount); //Use super because we overloaded _mint in this contract and need old behaviour
        emit DistributionCreated(amount, currentTotalSupply);
    }

    /**
     * @notice Claims distributions and allows to specify how many distributions to process.
     * This allows limit gas usage.
     * One can do this for others
     */
    function claimDistributions(address account, uint256 lastDistribution) public {
        require(lastDistribution < distributions.length, "DistributionToken: lastDistribution too hight");
        require(nextDistributions[account] < lastDistribution, "DistributionToken: no distributions to claim");
        _updateUserBalance(account, lastDistribution+1); //+1 is safe because we've already checked lastDistribution < distributions.length
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

    function _updateUserBalance(address account) internal {
        _updateUserBalance(account, distributions.length);
    }

    function _updateUserBalance(address account, uint256 nextDistribution) internal {
        uint256 startDistribution = nextDistributions[account];
        if (startDistribution >= nextDistribution) return;
        uint256 distributionAmount = calculateClaimAmount(account, nextDistribution);
        nextDistributions[account] = nextDistribution;
        super._transfer(address(this), account, distributionAmount);
        emit DistributionsClaimed(account, distributionAmount, startDistribution, nextDistribution);
    }

    /**
     * @notice Balance of account, which is counted for distributions
     * It only represents already distributed balance.
     * @dev This function should be overloaded to include balance of locked tokens
     */
    function distributionBalanceOf(address account) internal view returns(uint256) {
        return balanceOf(account);
    }

    /**
     * @notice Calculates amount of account's tokens to be claimed from distributions
     */
    function calculateClaimAmount(address account) internal view returns(uint256) {
        if (nextDistributions[account] >= distributions.length) return 0;
        return calculateClaimAmount(account, distributions.length);
    }

    function calculateClaimAmount(address account, uint256 nextDistribution) internal view returns(uint256) {
        assert(nextDistribution <= distributions.length);
        uint256 startDistribution = nextDistributions[account];
        uint256 initialBalance = distributionBalanceOf(account);
        uint256 next = startDistribution;
        uint256 balance = initialBalance;
        while (next < nextDistribution) {
            uint256 da = balance.mul(distributions[next].amount).div(distributions[next].totalSupply);
            balance = balance.add(da);
            next++;
        }
        return balance.sub(initialBalance);
    }

}