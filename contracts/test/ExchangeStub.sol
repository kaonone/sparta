pragma solidity ^0.5.0;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";

/**
 * This ExchangeStub works with ERC20 tokens whih additionaly provide
 * a mint method of different name, but with two arguments: beneficiary address and amount.
 * FreeDAI and CompoundDAIStub will work.
 */
contract ExchangeStub {
    bytes4 public mintMethodSelector;

    constructor(string memory mintMethod) public {
        mintMethodSelector = bytes4(keccak256(bytes(mintMethod)));
    }

    function exchange(IERC20 token1, uint256 amount1, IERC20 token2, uint256 amount2) external {
        token1.transferFrom(msg.sender, address(this), amount1);
        uint256 balance = token2.balanceOf(address(this));
        if (balance < amount2){
            mint(token2, amount2 - balance);
        }
        token2.transfer(msg.sender, amount2);
    }

    function mint(IERC20 token, uint256 amount) internal {
        bytes memory message = abi.encodeWithSelector(mintMethodSelector, address(this), amount);
        (bool success, ) = address(token).call(message);
        require(success, "ExchangeStub: failed to mint new tokens");
    }

}
