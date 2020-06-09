pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC721/IERC721Receiver.sol";
import "../../interfaces/token/IPToken.sol";
import "../../interfaces/defi/IRAY.sol";
import "../../interfaces/defi/IRAYStorage.sol";
import "./DefiModuleBase.sol";

contract RAYModule is DefiModuleBase, IERC721Receiver {
    bytes32 public constant PORTFOLIO_ID = keccak256("DaiCompound"); //keccak256("DaiBzxCompoundDydx")
    bytes32 internal constant PORTFOLIO_MANAGER_CONTRACT = keccak256("PortfolioManagerContract");
    bytes32 internal constant NAV_CALCULATOR_CONTRACT = keccak256("NAVCalculatorContract");
    bytes32 internal constant RAY_TOKEN_CONTRACT = keccak256("RAYTokenContract");
    bytes4 internal constant ERC721_RECEIVER = bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));

    bytes32 public rayTokenId;

    function initialize(address _pool) public initializer {
        DefiModuleBase.initialize(_pool);
    }

    function onERC721Received(address, address, uint256, bytes memory) public returns (bytes4) {
        address rayTokenContract = rayStorage().getContractAddress(RAY_TOKEN_CONTRACT);
        require(_msgSender() == rayTokenContract, "RAYModule: only accept RAY Token transfers");
        return ERC721_RECEIVER;
    }

    function handleDepositInternal(address, uint256 amount) internal {
        IRAY pm = rayPortfolioManager();
        lToken().approve(address(pm), amount);
        if (rayTokenId == 0x0) {
            rayTokenId = pm.mint(PORTFOLIO_ID, address(this), amount);
        } else {
            pm.deposit(rayTokenId, amount);
        }
    }

    function withdrawInternal(address beneficiary, uint256 amount) internal {
        rayPortfolioManager().redeem(rayTokenId, amount, address(0));
        lToken().transfer(beneficiary, amount);
    }

    /**
     * @dev This function allows move funds to RayModule (by loading current balances)
     * and at the same time does not require Pool to be fully-initialized on deployment
     */
    function initialBalances() internal returns(uint256 poolDAI, uint256 totalPTK) {
        bool success;
        bytes memory result;

        poolDAI = poolBalanceOfDAI(); // This returns 0 immidiately if rayTokenId == 0x0, and it can not be zero only if all addresses available

        (success, result) = pool.staticcall(abi.encodeWithSignature("get(string)", MODULE_PTOKEN));
        require(success, "RAYModule: Pool error on get(ptoken)");
        address ptk = abi.decode(result, (address));
        if (ptk != ZERO_ADDRESS) totalPTK = IPToken(ptk).distributionTotalSupply(); // else totalPTK == 0;
    }

    function poolBalanceOfDAI() internal returns(uint256) {
        if (rayTokenId == 0x0) return 0;
        (uint256 poolDAI,) = rayNAVCalculator().getTokenValue(PORTFOLIO_ID, rayTokenId);
        return poolDAI;
    }
    
    function totalSupplyOfPTK() internal view returns(uint256) {
        return pToken().distributionTotalSupply();
    }
    
    function rayPortfolioManager() private view returns(IRAY){
        return rayPortfolioManager(rayStorage());
    }

    function rayPortfolioManager(IRAYStorage rayStorage) private view returns(IRAY){
        return IRAY(rayStorage.getContractAddress(PORTFOLIO_MANAGER_CONTRACT));
    }

    function rayNAVCalculator() private view returns(IRAY){
        return rayNAVCalculator(rayStorage());
    }

    function rayNAVCalculator(IRAYStorage rayStorage) private view returns(IRAY){
        return IRAY(rayStorage.getContractAddress(NAV_CALCULATOR_CONTRACT));
    }

    function rayStorage() private view returns(IRAYStorage){
        return IRAYStorage(getModuleAddress(MODULE_RAY));
    }

    function lToken() private view returns(IERC20){
        return IERC20(getModuleAddress(MODULE_LTOKEN));
    }
    
    function pToken() private view returns(IPToken){
        return IPToken(getModuleAddress(MODULE_PTOKEN));
    }
}
