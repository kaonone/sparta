pragma solidity ^0.5.0;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "../../interfaces/token/IPToken.sol";
import "../../common/Module.sol";
import "./ArbitrageExecutor.sol";

contract ArbitrageModule is Module {
    using SafeMath for uint256;

    event ExecutorCreated(address beneficiary, address executor);

    mapping(address => ArbitrageExecutor) public executors;

    function initialize(address _pool) public initializer {
        Module.initialize(_pool);
    }

    function createExecutor() public returns(address) {
        address beneficiary = _msgSender();
        require(!hasExecutor(beneficiary), "ArbitrageModule: executor already created");

        // Check beneficiary is allowed to have executor
        uint256 pBalance = pToken().distributionBalanceOf(beneficiary);
        require(pBalance > 0, "ArbitrageModule: beneficiary required to own PTK");

        // Create executor
        ArbitrageExecutor executor = new ArbitrageExecutor(beneficiary);
        executors[beneficiary] = executor;
        emit ExecutorCreated(beneficiary, address(executor));
        return address(executor);        
    }

    function hasExecutor(address beneficiary) public view returns(bool) {
        return address(executors[beneficiary]) != ZERO_ADDRESS;
    }

    function pToken() private view returns(IPToken){
        return IPToken(getModuleAddress(MODULE_PTOKEN));
    }

}