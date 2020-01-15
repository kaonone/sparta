pragma solidity ^0.5.12;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/GSN/Context.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Roles.sol";

contract FundsOperatorRole is Initializable, Context {
    using Roles for Roles.Role;

    event FundsOperatorAdded(address indexed account);
    event FundsOperatorRemoved(address indexed account);

    Roles.Role private _operators;

    function initialize(address sender) public initializer {
        if (!isFundsOperator(sender)) {
            _addFundsOperator(sender);
        }
    }

    modifier onlyFundsOperator() {
        require(isFundsOperator(_msgSender()), "FundsOperatorRole: caller does not have the FundsOperator role");
        _;
    }

    function addFundsOperator(address account) public onlyFundsOperator {
        _addFundsOperator(account);
    }

    function renounceFundsOperator() public {
        _removeFundsOperator(_msgSender());
    }

    function isFundsOperator(address account) public view returns (bool) {
        return _operators.has(account);
    }

    function _addFundsOperator(address account) internal {
        _operators.add(account);
        emit FundsOperatorAdded(account);
    }

    function _removeFundsOperator(address account) internal {
        _operators.remove(account);
        emit FundsOperatorRemoved(account);
    }

}

