pragma solidity ^0.5.0;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "../interfaces/flashloans/IFlashLoanReceiver.sol";

//solhint-disable func-order
contract FlashLoanReceiverStub is IFlashLoanReceiver, Ownable {
    using SafeMath for uint256;

    function initialize() public initializer {
        Ownable.initialize(_msgSender());
    }

    function executeOperation(address token, uint256 amount, uint256 fee, bytes calldata data) external {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance == amount, "FlashLoanReceiverStub: inital amount does not match");

        executeOperationInternal(token, amount, fee, data);

        balance = IERC20(token).balanceOf(address(this));
        uint256 repay = amount.add(fee);
        require(balance >= repay, "FlashLoanReceiverStub: not enough funds to return loan");
        IERC20(token).transfer(msg.sender, repay);
        uint256 profit = balance - repay;
        if (profit > 0) {
            IERC20(token).transfer(owner(), profit);
        }
    }

    function executeOperationInternal(address, uint256, uint256, bytes memory data) internal {
        // FreeDAI(token).mint(amount);
        (address payable target, uint256 val, bytes memory message) = abi.decode(data, (address, uint256, bytes));
        (bool success, bytes memory result) =  target.call.value(val)(message);
        if (!success) {
            string memory reason= string(abi.encodePacked("FlashLoanReceiverStub: requested operation failed: ", result));
            revert(reason);
        }
    }

}