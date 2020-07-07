pragma solidity ^0.5.0;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/GSN/Context.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Detailed.sol";

contract MintableToken is Initializable, Context, ERC20, ERC20Detailed {

    function initialize(string memory symbol, uint8 decimals) public initializer {
        ERC20Detailed.initialize(
            string(abi.encodePacked(symbol, " token")),
            symbol, 
            decimals
        );
    }

    /**
    * @notice Allows minting of this token
    * @param amount Amount to  mint
    */
    function mint(uint256 amount) public returns (bool) {
        _mint(_msgSender(), amount);
        return true;
    }

    /**
    * @notice Allows minting of this token
    * @param account Receiver ot minted tokens
    * @param amount Amount to  mint
    */
    function mint(address account, uint256 amount) public returns (bool) {
        _mint(account, amount);
        return true;
    }

    /**
    * @notice Allows minting of this token in a manner simmilar to Compound DAI on Rinkeby
    * @param recipient Receiver ot minted tokens
    * @param value Amount to  mint
    */
    function allocateTo(address recipient, uint256 value) public {
        _mint(recipient, value);
    }

}