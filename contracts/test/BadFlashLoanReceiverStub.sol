pragma solidity ^0.5.0;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "../interfaces/flashloans/IFlashLoanReceiver.sol";
import "../token/FreeDAI.sol";

//solhint-disable func-order
contract BadFlashLoanReceiverStub is IFlashLoanReceiver, Ownable {
    using SafeMath for uint256;

    function initialize() public initializer {
        Ownable.initialize(_msgSender());
    }

    function executeOperation(address token, uint256 amount, uint256, bytes calldata) external {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance == amount, "FlashLoanReceiverStub: inital amount does not match");

        FreeDAI(token).mint(amount/10);

        balance = IERC20(token).balanceOf(address(this));
        uint256 repay = amount; //As a bad FlashLoanReceiver we will not repay fee

        IERC20(token).transfer(msg.sender, repay);
        uint256 profit = balance - repay;
        if (profit > 0) {
            IERC20(token).transfer(owner(), profit);
        }
    }

}