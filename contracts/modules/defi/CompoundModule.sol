pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "../../interfaces/token/IPToken.sol";
import "./DefiModuleBase.sol";
import "./TestnetCErc20Proxy.sol";

contract CompoundModule is DefiModuleBase {

    function initialize(address _pool) public initializer {
        DefiModuleBase.initialize(_pool);
    }

    function depositInternal(address sender, uint256 amount) internal {
        IERC20 ltoken = lToken();
        TestnetCErc20Proxy cdai = cDAI();
        ltoken.transferFrom(sender, address(this), amount);
        ltoken.approve(address(cdai), amount);
        cdai.mint(amount);
    }

    function withdrawInternal(address beneficiary, uint256 amount) internal {
        cDAI().redeemUnderlying(amount);
        lToken().transfer(beneficiary, amount);
    }

    function poolBalanceOfDAI() internal returns(uint256) {
        return cDAI().balanceOfUnderlying(address(this));
    }
    
    function totalSupplyOfPTK() internal view returns(uint256) {
        return pToken().distributionTotalSupply();
    }

    function cDAI() private view returns(TestnetCErc20Proxy){
        return TestnetCErc20Proxy(getModuleAddress(MODULE_CDAI));
    }

    function lToken() private view returns(IERC20){
        return IERC20(getModuleAddress(MODULE_LTOKEN));
    }
    
    function pToken() private view returns(IPToken){
        return IPToken(getModuleAddress(MODULE_PTOKEN));
    }
}
