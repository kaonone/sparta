pragma solidity ^0.5.12;

import "../../common/Role.sol";

contract FundsOperatorRole is Role {
    string constant private ROLE_NAME = "FundsOperator";

    event FundsOperatorAdded(address indexed account);
    event FundsOperatorRemoved(address indexed account);

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
        return hasRole(ROLE_NAME, account);
    }

    function _addFundsOperator(address account) internal {
        addRole(ROLE_NAME, account);
        emit FundsOperatorAdded(account);
    }

    function _removeFundsOperator(address account) internal {
        removeRole(ROLE_NAME, account);
        emit FundsOperatorRemoved(account);
    }

    function thisModuleName() view internal returns(string memory) {
        return MODULE_FUNDS;
    }

}

