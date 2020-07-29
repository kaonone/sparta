pragma solidity ^0.5.12;

import "../modules/defi/RAYProtocol.sol";

contract RAYProtocol_DAI is RAYProtocol {
    bytes32 public constant PORTFOLIO_ID = keccak256("DaiCompound"); //keccak256("DaiBzxCompoundDydx")

    function initialize(address _pool, address _token) public initializer {
        RAYProtocol.initialize(
            _pool, 
            _token,
            PORTFOLIO_ID
        );
    }    
}
