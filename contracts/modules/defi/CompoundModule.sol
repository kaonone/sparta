pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "../../interfaces/token/IPToken.sol";
import "../../interfaces/defi/ICErc20.sol";
import "./DefiModuleBase.sol";

contract CompoundModule is DefiModuleBase {

    function initialize(address _pool) public initializer {
        DefiModuleBase.initialize(_pool);
    }

    function handleDepositInternal(address, uint256 amount) internal {
        IERC20 ltoken = lToken();
        ICErc20 cdai = cDAI();
        //ltoken.transferFrom(sender, address(this), amount); //This transfer should be executed by FundsModule
        //require(lToken.balanceOf(address(this) >= amount, "CompoundModule: not enough DAI"); //No need to check: if not enough DAI, cdai.mint() will fail
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

    /**
     * @dev This function allows move funds to CompoundModule (by loading current balances)
     * and at the same time does not require Pool to be fully-initialized on deployment
     */
    function initialBalances() internal returns(uint256 poolDAI, uint256 totalPTK) {
        bool success;
        bytes memory result;
        (success, result) = pool.staticcall(abi.encodeWithSignature("get(string)", MODULE_CDAI));
        require(success, "CompoundModule: Pool error on get(cdai)");
        address cDai = abi.decode(result, (address));
        if (cDai != ZERO_ADDRESS) poolDAI = ICErc20(cDai).balanceOfUnderlying(address(this)); // else poolDAI == 0;

        (success, result) = pool.staticcall(abi.encodeWithSignature("get(string)", MODULE_PTOKEN));
        require(success, "CompoundModule: Pool error on get(ptoken)");
        address ptk = abi.decode(result, (address));
        if (ptk != ZERO_ADDRESS) totalPTK = IPToken(ptk).distributionTotalSupply(); // else totalPTK == 0;
    }

    function cDAI() private view returns(ICErc20){
        return ICErc20(getModuleAddress(MODULE_CDAI));
    }

    function lToken() private view returns(IERC20){
        return IERC20(getModuleAddress(MODULE_LTOKEN));
    }
    
    function pToken() private view returns(IPToken){
        return IPToken(getModuleAddress(MODULE_PTOKEN));
    }
}
