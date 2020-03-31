pragma solidity ^0.5.12;

import "../../interfaces/defi/ICErc20.sol";
import "../../interfaces/defi/ITestnetCompoundDAI.sol";
import "../../token/FreeDAI.sol";
import "../../common/Base.sol";


contract TestnetCErc20Proxy is ICErc20, Base {
    ITestnetCompoundDAI compoundDAI;
    FreeDAI akropolisDAI;

    function initialize(address _akropolisDAI, address _compoundDAI) public initializer {
        Base.initialize();
        akropolisDAI = FreeDAI(_akropolisDAI);
        compoundDAI = ITestnetCompoundDAI(_compoundDAI);
    }

}