pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Detailed.sol";
import "../interfaces/defi/ITestnetCompoundDAI.sol";
import "../common/Base.sol";

/**
 * @notice Simple token which everyone can mint
 */
contract CompoundDAIStub is Base, ITestnetCompoundDAI, ERC20, ERC20Detailed {

    function initialize() public initializer {
        Base.initialize();
        ERC20Detailed.initialize("Compound testnet DAI", "DAI", 18);
    }

    function allocateTo(address recipient, uint256 value) public {
        _mint(recipient, value);
    }
}

