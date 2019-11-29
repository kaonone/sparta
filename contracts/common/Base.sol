pragma solidity ^0.5.12;


import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";

/*
    Base contract for all modules
*/
contract Base is Initializable, Ownable {
    address constant  ZERO_ADDRESS = address(0);

    address pool;

    function initialize(address sender) public initializer {
        Ownable.initialize(sender);
    }

    function setPool(address _pool) public onlyOwner {
        pool = _pool;        
    }

    function getModuleAddress(string memory module) public view returns(address){
        require(pool != ZERO_ADDRESS, "Base: no pool");
        (bool success, bytes memory result) = pool.staticcall(abi.encodeWithSignature("get(string)", module));
        
        //Forward error from Pool contract
        if (!success) assembly {
            revert(add(result, 32), result)
        }

        address moduleAddress = abi.decode(result, (address));
        require(moduleAddress != ZERO_ADDRESS, "Base: requested module not found");
        return moduleAddress;
    }

    // function selfExecutingBySignature(
    //     string memory _functionSignature,
    //     bytes memory _parameters) public
    // {
    //     (bool success, /*bytes memory data*/) = address(this).call(abi.encodeWithSignature(_functionSignature, _parameters));
    //     require(success,
    //         "Execution failed"
    //     );
    // }

    // function executingBySignature(
    //     address recipient,
    //     string memory _functionSignature,
    //     bytes memory _parameters
    // ) public
    // {
    //     (bool success, /*bytes memory data*/) = recipient.call(abi.encodeWithSignature(_functionSignature, _parameters));
    //     require(success,
    //         "Execution failed"
    //     );
    // }
}
