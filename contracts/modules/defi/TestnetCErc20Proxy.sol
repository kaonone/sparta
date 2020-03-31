pragma solidity ^0.5.12;

import "../../interfaces/defi/ICErc20.sol";
import "../../interfaces/defi/ITestnetCompoundDAI.sol";
import "../token/FreeDAI.sol";
import "../common/Base.sol";


contract TestnetCErc20Proxy is ICErc20, Base {
    ITestnetCompoundDAI compoundDAI;
    FreeDAI akropolisDAI;

    function initialize(address akropolisDAI, address compoundDAI) public initializer {
        Base.initialize();
        akropolisDAI = FreeDAI(akropolisDAI);
        compoundDAI = ITestnetCompoundDAI(compoundDAI);
    }

}