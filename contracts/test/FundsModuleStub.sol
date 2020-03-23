pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "../interfaces/curve/IFundsModule.sol";
import "../token/pTokens/PToken.sol";
import "../common/Module.sol";

/**
 * @notice
 * Stub of LoanModule to allow tests of FundsModule and LiquidityModule
 */
 //solhint-disable func-order
contract FundsModuleStub is Module, IFundsModule {

    function initialize(address _pool) public initializer {
        Module.initialize(_pool);
    }

    function depositLTokens(address, uint256) external {
        this;
    }

    function withdrawLTokens(address, uint256) external {
        this;
    }

    function withdrawLTokens(address, uint256, uint256) external {
        this;
    }

    function depositPTokens(address from, uint256 amount) external {
        pToken().transferFrom(from, address(this), amount);
    }

    function withdrawPTokens(address to, uint256 amount) external {
        pToken().transfer(to, amount);
    }

    function mintPTokens(address to, uint256 amount) external {
        pToken().mint(to, amount);
    }

    function distributePTokens(uint256 amount) external {
        pToken().distribute(amount);
    }

    function burnPTokens(address, uint256) external {
        this;
    }

    function lockPTokens(address[] calldata, uint256[] calldata) external {
        this;
    }

    function mintAndLockPTokens(uint256) external {
        this;
    }

    function unlockAndWithdrawPTokens(address, uint256) external {
        this;
    }

    function burnLockedPTokens(uint256) external {
        this;
    }

    function calculatePoolEnter(uint256) external view returns(uint256) {
        return 0;
    }

    function calculatePoolEnter(uint256, uint256) external view returns(uint256) {
        return 0;
    }

    function calculatePoolExit(uint256) external view returns(uint256) {
        return 0;
    }
    
    function calculatePoolExitWithFee(uint256) external view returns(uint256){
        return 0;
    }
    
    function calculatePoolExitWithFee(uint256, uint256) external view returns(uint256){
        return 0;
    }

    function calculatePoolExitInverse(uint256) external view returns(uint256, uint256, uint256) {
        return (0, 0, 0);
    }

    function lBalance() external view returns(uint256) {
        return 0;
    }

    function pBalanceOf(address) external view returns(uint256){
        return 0;
    }

    function pToken() private view returns(IPToken){
        return IPToken(getModuleAddress(MODULE_PTOKEN));
    }
}