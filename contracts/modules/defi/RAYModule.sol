pragma solidity ^0.5.12;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC721/IERC721Receiver.sol";
import "../../interfaces/token/IPToken.sol";
import "../../interfaces/defi/IRAY.sol";
import "../../interfaces/defi/IRAYStorage.sol";
import "./DefiModuleBase.sol";

contract RAYModule is DefiModuleBase, IERC721Receiver {
    bytes32 public constant PORTFOLIO_ID = keccak256('DaiCompound'); //keccak256('DaiBzxCompoundDydx')
    bytes32 internal constant PORTFOLIO_MANAGER_CONTRACT = keccak256("PortfolioManagerContract");
    bytes32 internal constant RAY_TOKEN_CONTRACT = keccak256("RAYTokenContract");
    bytes4 internal constant ERC721_RECEIVER = bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));

    bytes32 rayTokenId;

    function initialize(address _pool) public initializer {
        DefiModuleBase.initialize(_pool);
    }

    function setup() public onlyDefiOperator {
        require (rayTokenId == 0x0, "RAYModule: RAY token already initialized");
        _setup();
    }
    function onERC721Received(address, address, uint256, bytes memory) public returns (bytes4) {
        address rayTokenContract = rayStorage().getContractAddress(PORTFOLIO_MANAGER_CONTRACT);
        require(_msgSender() == rayTokenContract, "RAYModule: only accept RAY Token transfers");
        return ERC721_RECEIVER;
    }

    function handleDepositInternal(address, uint256 amount) internal {
        IERC20 ltoken = lToken();
        IRAY pm = rayPortfolioManager();
        ltoken.approve(address(pm), amount);
        pm.deposit(rayTokenId, amount);
    }

    function withdrawInternal(address beneficiary, uint256 amount) internal {
        rayPortfolioManager().redeem(rayTokenId, amount, address(0));
        lToken().transfer(beneficiary, amount);
    }

    /**
     * @dev Initialize RAY token
     */
    function _setup() internal {
        if(rayTokenId == 0x0) return;
        uint256 ourBalance = lToken().balanceOf(address(this));
        IRAY pm = rayPortfolioManager();
        if(ourBalance > 0){
            lToken().approve(address(pm), ourBalance);
        }
        rayTokenId = pm.mint(PORTFOLIO_ID, address(this), 0);
    }

    /**
     * @dev This function allows move funds to RayModule (by loading current balances)
     * and at the same time does not require Pool to be fully-initialized on deployment
     */
    function initialBalances() internal returns(uint256 poolDAI, uint256 totalPTK) {
        bool success;
        bytes memory result;
        (success, result) = pool.staticcall(abi.encodeWithSignature("get(string)", MODULE_RAY));
        require(success, "CompoundModule: Pool error on get(ray)");
        address rayStorageAddr = abi.decode(result, (address));
        if (rayStorageAddr != ZERO_ADDRESS){
            _setup();
            IRAYStorage rayStorage = IRAYStorage(rayStorageAddr);
            IRAY pm = IRAY(rayStorage.getContractAddress(PORTFOLIO_MANAGER_CONTRACT));
            (poolDAI,) = pm.getTokenValue(PORTFOLIO_ID, rayTokenId);
        } // else poolDAI == 0;

        (success, result) = pool.staticcall(abi.encodeWithSignature("get(string)", MODULE_PTOKEN));
        require(success, "CompoundModule: Pool error on get(ptoken)");
        address ptk = abi.decode(result, (address));
        if (ptk != ZERO_ADDRESS) totalPTK = IPToken(ptk).distributionTotalSupply(); // else totalPTK == 0;
    }

    function poolBalanceOfDAI() internal returns(uint256) {
        (uint256 poolDAI,) = rayPortfolioManager().getTokenValue(PORTFOLIO_ID, rayTokenId);
        return poolDAI;
    }
    
    function totalSupplyOfPTK() internal view returns(uint256) {
        return pToken().distributionTotalSupply();
    }
    
    function rayPortfolioManager() private view returns(IRAY){
        return IRAY(rayStorage().getContractAddress(PORTFOLIO_MANAGER_CONTRACT));
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
