/**
 *Submitted for verification at Etherscan.io on 2020-07-30
 */

// File: @openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol

pragma solidity ^0.5.0;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP. Does not include
 * the optional functions; to access them see {ERC20Detailed}.
 */
interface IERC20 {
    /**
     * @dev Returns the amount of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from the caller's account to `recipient`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address recipient, uint256 amount)
        external
        returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender)
        external
        view
        returns (uint256);

    /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Moves `amount` tokens from `sender` to `recipient` using the
     * allowance mechanism. `amount` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}

// File: @openzeppelin/upgrades/contracts/Initializable.sol

pragma solidity >=0.4.24 <0.7.0;

/**
 * @title Initializable
 *
 * @dev Helper contract to support initializer functions. To use it, replace
 * the constructor with a function that has the `initializer` modifier.
 * WARNING: Unlike constructors, initializer functions must be manually
 * invoked. This applies both to deploying an Initializable contract, as well
 * as extending an Initializable contract via inheritance.
 * WARNING: When used with inheritance, manual care must be taken to not invoke
 * a parent initializer twice, or ensure that all initializers are idempotent,
 * because this is not dealt with automatically as with constructors.
 */
contract Initializable {
    /**
     * @dev Indicates that the contract has been initialized.
     */
    bool private initialized;

    /**
     * @dev Indicates that the contract is in the process of being initialized.
     */
    bool private initializing;

    /**
     * @dev Modifier to use in the initializer function of a contract.
     */
    modifier initializer() {
        require(
            initializing || isConstructor() || !initialized,
            "Contract instance has already been initialized"
        );

        bool isTopLevelCall = !initializing;
        if (isTopLevelCall) {
            initializing = true;
            initialized = true;
        }

        _;

        if (isTopLevelCall) {
            initializing = false;
        }
    }

    /// @dev Returns true if and only if the function is running in the constructor
    function isConstructor() private view returns (bool) {
        // extcodesize checks the size of the code stored in an address, and
        // address returns the current address. Since the code is still not
        // deployed when running a constructor, any checks on its code size will
        // yield zero, making it an effective way to detect if a contract is
        // under construction or not.
        address self = address(this);
        uint256 cs;
        assembly {
            cs := extcodesize(self)
        }
        return cs == 0;
    }

    // Reserved storage space to allow for layout changes in the future.
    uint256[50] private ______gap;
}

// File: @openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Detailed.sol

pragma solidity ^0.5.0;

/**
 * @dev Optional functions from the ERC20 standard.
 */
contract ERC20Detailed is Initializable, IERC20 {
    string private _name;
    string private _symbol;
    uint8 private _decimals;

    /**
     * @dev Sets the values for `name`, `symbol`, and `decimals`. All three of
     * these values are immutable: they can only be set once during
     * construction.
     */
    function initialize(
        string memory name,
        string memory symbol,
        uint8 decimals
    ) public initializer {
        _name = name;
        _symbol = symbol;
        _decimals = decimals;
    }

    /**
     * @dev Returns the name of the token.
     */
    function name() public view returns (string memory) {
        return _name;
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name.
     */
    function symbol() public view returns (string memory) {
        return _symbol;
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     * For example, if `decimals` equals `2`, a balance of `505` tokens should
     * be displayed to a user as `5,05` (`505 / 10 ** 2`).
     *
     * Tokens usually opt for a value of 18, imitating the relationship between
     * Ether and Wei.
     *
     * NOTE: This information is only used for _display_ purposes: it in
     * no way affects any of the arithmetic of the contract, including
     * {IERC20-balanceOf} and {IERC20-transfer}.
     */
    function decimals() public view returns (uint8) {
        return _decimals;
    }

    uint256[50] private ______gap;
}

// File: @openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol

pragma solidity ^0.5.0;

/**
 * @dev Wrappers over Solidity's arithmetic operations with added overflow
 * checks.
 *
 * Arithmetic operations in Solidity wrap on overflow. This can easily result
 * in bugs, because programmers usually assume that an overflow raises an
 * error, which is the standard behavior in high level programming languages.
 * `SafeMath` restores this intuition by reverting the transaction when an
 * operation overflows.
 *
 * Using this library instead of the unchecked operations eliminates an entire
 * class of bugs, so it's recommended to use it always.
 */
library SafeMath {
    /**
     * @dev Returns the addition of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `+` operator.
     *
     * Requirements:
     * - Addition cannot overflow.
     */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");

        return c;
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting on
     * overflow (when the result is negative).
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     * - Subtraction cannot overflow.
     */
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        return sub(a, b, "SafeMath: subtraction overflow");
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting with custom message on
     * overflow (when the result is negative).
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     * - Subtraction cannot overflow.
     *
     * _Available since v2.4.0._
     */
    function sub(
        uint256 a,
        uint256 b,
        string memory errorMessage
    ) internal pure returns (uint256) {
        require(b <= a, errorMessage);
        uint256 c = a - b;

        return c;
    }

    /**
     * @dev Returns the multiplication of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `*` operator.
     *
     * Requirements:
     * - Multiplication cannot overflow.
     */
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        // Gas optimization: this is cheaper than requiring 'a' not being zero, but the
        // benefit is lost if 'b' is also tested.
        // See: https://github.com/OpenZeppelin/openzeppelin-contracts/pull/522
        if (a == 0) {
            return 0;
        }

        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");

        return c;
    }

    /**
     * @dev Returns the integer division of two unsigned integers. Reverts on
     * division by zero. The result is rounded towards zero.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        return div(a, b, "SafeMath: division by zero");
    }

    /**
     * @dev Returns the integer division of two unsigned integers. Reverts with custom message on
     * division by zero. The result is rounded towards zero.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     *
     * _Available since v2.4.0._
     */
    function div(
        uint256 a,
        uint256 b,
        string memory errorMessage
    ) internal pure returns (uint256) {
        // Solidity only automatically asserts when dividing by 0
        require(b > 0, errorMessage);
        uint256 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold

        return c;
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * Reverts when dividing by zero.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     */
    function mod(uint256 a, uint256 b) internal pure returns (uint256) {
        return mod(a, b, "SafeMath: modulo by zero");
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * Reverts with custom message when dividing by zero.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     *
     * _Available since v2.4.0._
     */
    function mod(
        uint256 a,
        uint256 b,
        string memory errorMessage
    ) internal pure returns (uint256) {
        require(b != 0, errorMessage);
        return a % b;
    }
}

// File: contracts/interfaces/defi/ICurveFiSwap.sol

pragma solidity ^0.5.12;

interface ICurveFiSwap {
    function add_liquidity(uint256[2] calldata amounts, uint256 min_mint_amount)
        external;

    function remove_liquidity(uint256 _amount, uint256[2] calldata min_amounts)
        external;

    function remove_liquidity_imbalance(
        uint256[2] calldata amounts,
        uint256 max_burn_amount
    ) external;

    function calc_token_amount(uint256[2] calldata amounts, bool deposit)
        external
        view
        returns (uint256);

    function balances(int128 i) external view returns (uint256);

    function A() external view returns (uint256);

    function fee() external view returns (uint256);

    function coins(int128 i) external view returns (address);
}

// File: contracts/interfaces/defi/ICurveFiDeposit.sol

pragma solidity ^0.5.12;

contract ICurveFiDeposit {
    function add_liquidity(
        uint256[2] calldata uamounts,
        uint256 min_mint_amount
    ) external;

    function remove_liquidity(uint256 _amount, uint256[2] calldata min_uamounts)
        external;

    function remove_liquidity_imbalance(
        uint256[2] calldata uamounts,
        uint256 max_burn_amount
    ) external;

    function remove_liquidity_one_coin(
        uint256 _token_amount,
        int128 i,
        uint256 min_uamount
    ) external;

    function remove_liquidity_one_coin(
        uint256 _token_amount,
        int128 i,
        uint256 min_uamount,
        bool donate_dust
    ) external;

    function withdraw_donated_dust() external;

    function coins(int128 i) external view returns (address);

    function underlying_coins(int128 i) external view returns (address);

    function curve() external view returns (address);

    function token() external view returns (address);

    function calc_withdraw_one_coin(uint256 _token_amount, int128 i)
        external
        view
        returns (uint256);
}

// File: @openzeppelin/contracts-ethereum-package/contracts/GSN/Context.sol

pragma solidity ^0.5.0;

/*
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with GSN meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
contract Context is Initializable {
    // Empty internal constructor, to prevent people from mistakenly deploying
    // an instance of this contract, which should be used via inheritance.
    constructor() internal {}

    // solhint-disable-previous-line no-empty-blocks

    function _msgSender() internal view returns (address payable) {
        return msg.sender;
    }

    function _msgData() internal view returns (bytes memory) {
        this; // silence state mutability warning without generating bytecode - see https://github.com/ethereum/solidity/issues/2691
        return msg.data;
    }
}

// File: @openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol

pragma solidity ^0.5.0;

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be aplied to your functions to restrict their use to
 * the owner.
 */
contract Ownable is Initializable, Context {
    address private _owner;

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    function initialize(address sender) public initializer {
        _owner = sender;
        emit OwnershipTransferred(address(0), _owner);
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(isOwner(), "Ownable: caller is not the owner");
        _;
    }

    /**
     * @dev Returns true if the caller is the current owner.
     */
    function isOwner() public view returns (bool) {
        return _msgSender() == _owner;
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions anymore. Can only be called by the current owner.
     *
     * > Note: Renouncing ownership will leave the contract without an owner,
     * thereby removing any functionality that is only available to the owner.
     */
    function renounceOwnership() public onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public onlyOwner {
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     */
    function _transferOwnership(address newOwner) internal {
        require(
            newOwner != address(0),
            "Ownable: new owner is the zero address"
        );
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }

    uint256[50] private ______gap;
}

// File: contracts/common/Base.sol

pragma solidity ^0.5.12;

/**
 * Base contract for all modules
 */
contract Base is Initializable, Context, Ownable {
    address constant ZERO_ADDRESS = address(0);

    function initialize() public initializer {
        Ownable.initialize(_msgSender());
    }
}

// File: contracts/interfaces/defi/IYErc20.sol

pragma solidity ^0.5.12;

//solhint-disable func-order
contract IYErc20 {
    //ERC20 functions
    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function transfer(address recipient, uint256 amount)
        external
        returns (bool);

    function allowance(address owner, address spender)
        external
        view
        returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

    function name() external view returns (string memory);

    function symbol() external view returns (string memory);

    function decimals() external view returns (uint8);

    //yToken functions
    function deposit(uint256 amount) external;

    function withdraw(uint256 shares) external;

    function getPricePerFullShare() external view returns (uint256);

    function token() external returns (address);
}

// File: @openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol

pragma solidity ^0.5.0;

/**
 * @dev Implementation of the {IERC20} interface.
 *
 * This implementation is agnostic to the way tokens are created. This means
 * that a supply mechanism has to be added in a derived contract using {_mint}.
 * For a generic mechanism see {ERC20Mintable}.
 *
 * TIP: For a detailed writeup see our guide
 * https://forum.zeppelin.solutions/t/how-to-implement-erc20-supply-mechanisms/226[How
 * to implement supply mechanisms].
 *
 * We have followed general OpenZeppelin guidelines: functions revert instead
 * of returning `false` on failure. This behavior is nonetheless conventional
 * and does not conflict with the expectations of ERC20 applications.
 *
 * Additionally, an {Approval} event is emitted on calls to {transferFrom}.
 * This allows applications to reconstruct the allowance for all accounts just
 * by listening to said events. Other implementations of the EIP may not emit
 * these events, as it isn't required by the specification.
 *
 * Finally, the non-standard {decreaseAllowance} and {increaseAllowance}
 * functions have been added to mitigate the well-known issues around setting
 * allowances. See {IERC20-approve}.
 */
contract ERC20 is Initializable, Context, IERC20 {
    using SafeMath for uint256;

    mapping(address => uint256) private _balances;

    mapping(address => mapping(address => uint256)) private _allowances;

    uint256 private _totalSupply;

    /**
     * @dev See {IERC20-totalSupply}.
     */
    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev See {IERC20-balanceOf}.
     */
    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    /**
     * @dev See {IERC20-transfer}.
     *
     * Requirements:
     *
     * - `recipient` cannot be the zero address.
     * - the caller must have a balance of at least `amount`.
     */
    function transfer(address recipient, uint256 amount) public returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    /**
     * @dev See {IERC20-allowance}.
     */
    function allowance(address owner, address spender)
        public
        view
        returns (uint256)
    {
        return _allowances[owner][spender];
    }

    /**
     * @dev See {IERC20-approve}.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function approve(address spender, uint256 amount) public returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    /**
     * @dev See {IERC20-transferFrom}.
     *
     * Emits an {Approval} event indicating the updated allowance. This is not
     * required by the EIP. See the note at the beginning of {ERC20};
     *
     * Requirements:
     * - `sender` and `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     * - the caller must have allowance for `sender`'s tokens of at least
     * `amount`.
     */
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(
            sender,
            _msgSender(),
            _allowances[sender][_msgSender()].sub(
                amount,
                "ERC20: transfer amount exceeds allowance"
            )
        );
        return true;
    }

    /**
     * @dev Atomically increases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function increaseAllowance(address spender, uint256 addedValue)
        public
        returns (bool)
    {
        _approve(
            _msgSender(),
            spender,
            _allowances[_msgSender()][spender].add(addedValue)
        );
        return true;
    }

    /**
     * @dev Atomically decreases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     * - `spender` must have allowance for the caller of at least
     * `subtractedValue`.
     */
    function decreaseAllowance(address spender, uint256 subtractedValue)
        public
        returns (bool)
    {
        _approve(
            _msgSender(),
            spender,
            _allowances[_msgSender()][spender].sub(
                subtractedValue,
                "ERC20: decreased allowance below zero"
            )
        );
        return true;
    }

    /**
     * @dev Moves tokens `amount` from `sender` to `recipient`.
     *
     * This is internal function is equivalent to {transfer}, and can be used to
     * e.g. implement automatic token fees, slashing mechanisms, etc.
     *
     * Emits a {Transfer} event.
     *
     * Requirements:
     *
     * - `sender` cannot be the zero address.
     * - `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     */
    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");

        _balances[sender] = _balances[sender].sub(
            amount,
            "ERC20: transfer amount exceeds balance"
        );
        _balances[recipient] = _balances[recipient].add(amount);
        emit Transfer(sender, recipient, amount);
    }

    /** @dev Creates `amount` tokens and assigns them to `account`, increasing
     * the total supply.
     *
     * Emits a {Transfer} event with `from` set to the zero address.
     *
     * Requirements
     *
     * - `to` cannot be the zero address.
     */
    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: mint to the zero address");

        _totalSupply = _totalSupply.add(amount);
        _balances[account] = _balances[account].add(amount);
        emit Transfer(address(0), account, amount);
    }

    /**
     * @dev Destroys `amount` tokens from `account`, reducing the
     * total supply.
     *
     * Emits a {Transfer} event with `to` set to the zero address.
     *
     * Requirements
     *
     * - `account` cannot be the zero address.
     * - `account` must have at least `amount` tokens.
     */
    function _burn(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: burn from the zero address");

        _balances[account] = _balances[account].sub(
            amount,
            "ERC20: burn amount exceeds balance"
        );
        _totalSupply = _totalSupply.sub(amount);
        emit Transfer(account, address(0), amount);
    }

    /**
     * @dev Sets `amount` as the allowance of `spender` over the `owner`s tokens.
     *
     * This is internal function is equivalent to `approve`, and can be used to
     * e.g. set automatic allowances for certain subsystems, etc.
     *
     * Emits an {Approval} event.
     *
     * Requirements:
     *
     * - `owner` cannot be the zero address.
     * - `spender` cannot be the zero address.
     */
    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) internal {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    /**
     * @dev Destroys `amount` tokens from `account`.`amount` is then deducted
     * from the caller's allowance.
     *
     * See {_burn} and {_approve}.
     */
    function _burnFrom(address account, uint256 amount) internal {
        _burn(account, amount);
        _approve(
            account,
            _msgSender(),
            _allowances[account][_msgSender()].sub(
                amount,
                "ERC20: burn amount exceeds allowance"
            )
        );
    }

    uint256[50] private ______gap;
}

// File: @openzeppelin/contracts-ethereum-package/contracts/access/Roles.sol

pragma solidity ^0.5.0;

/**
 * @title Roles
 * @dev Library for managing addresses assigned to a Role.
 */
library Roles {
    struct Role {
        mapping(address => bool) bearer;
    }

    /**
     * @dev Give an account access to this role.
     */
    function add(Role storage role, address account) internal {
        require(!has(role, account), "Roles: account already has role");
        role.bearer[account] = true;
    }

    /**
     * @dev Remove an account's access to this role.
     */
    function remove(Role storage role, address account) internal {
        require(has(role, account), "Roles: account does not have role");
        role.bearer[account] = false;
    }

    /**
     * @dev Check if an account has this role.
     * @return bool
     */
    function has(Role storage role, address account)
        internal
        view
        returns (bool)
    {
        require(account != address(0), "Roles: account is the zero address");
        return role.bearer[account];
    }
}

// File: @openzeppelin/contracts-ethereum-package/contracts/access/roles/MinterRole.sol

pragma solidity ^0.5.0;

contract MinterRole is Initializable, Context {
    using Roles for Roles.Role;

    event MinterAdded(address indexed account);
    event MinterRemoved(address indexed account);

    Roles.Role private _minters;

    function initialize(address sender) public initializer {
        if (!isMinter(sender)) {
            _addMinter(sender);
        }
    }

    modifier onlyMinter() {
        require(
            isMinter(_msgSender()),
            "MinterRole: caller does not have the Minter role"
        );
        _;
    }

    function isMinter(address account) public view returns (bool) {
        return _minters.has(account);
    }

    function addMinter(address account) public onlyMinter {
        _addMinter(account);
    }

    function renounceMinter() public {
        _removeMinter(_msgSender());
    }

    function _addMinter(address account) internal {
        _minters.add(account);
        emit MinterAdded(account);
    }

    function _removeMinter(address account) internal {
        _minters.remove(account);
        emit MinterRemoved(account);
    }

    uint256[50] private ______gap;
}

// File: @openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Mintable.sol

pragma solidity ^0.5.0;

/**
 * @dev Extension of {ERC20} that adds a set of accounts with the {MinterRole},
 * which have permission to mint (create) new tokens as they see fit.
 *
 * At construction, the deployer of the contract is the only minter.
 */
contract ERC20Mintable is Initializable, ERC20, MinterRole {
    function initialize(address sender) public initializer {
        MinterRole.initialize(sender);
    }

    /**
     * @dev See {ERC20-_mint}.
     *
     * Requirements:
     *
     * - the caller must have the {MinterRole}.
     */
    function mint(address account, uint256 amount)
        public
        onlyMinter
        returns (bool)
    {
        _mint(account, amount);
        return true;
    }

    uint256[50] private ______gap;
}

// File: @openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Burnable.sol

pragma solidity ^0.5.0;

/**
 * @dev Extension of {ERC20} that allows token holders to destroy both their own
 * tokens and those that they have an allowance for, in a way that can be
 * recognized off-chain (via event analysis).
 */
contract ERC20Burnable is Initializable, Context, ERC20 {
    /**
     * @dev Destroys `amount` tokens from the caller.
     *
     * See {ERC20-_burn}.
     */
    function burn(uint256 amount) public {
        _burn(_msgSender(), amount);
    }

    /**
     * @dev See {ERC20-_burnFrom}.
     */
    function burnFrom(address account, uint256 amount) public {
        _burnFrom(account, amount);
    }

    uint256[50] private ______gap;
}

// File: contracts/test/CurveFiTokenStub.sol

pragma solidity ^0.5.12;

contract CurveFiTokenStub is
    Base,
    ERC20,
    ERC20Detailed,
    ERC20Mintable,
    ERC20Burnable
{
    function initialize() public initializer {
        Base.initialize();
        ERC20Detailed.initialize("curve.fi token", "yDAI/yUSDC/yUSDT", 18);
    }
}

// File: contracts/test/CurveFiSwapStub.sol

pragma solidity ^0.5.12;

contract CurveFiSwapStub is Base, ICurveFiSwap {
    using SafeMath for uint256;
    uint256 public constant N_COINS = 2;
    uint256 constant MAX_EXCHANGE_FEE = 0.05 * 1e18;

    CurveFiTokenStub public token;
    address[2] _coins;

    function initialize(address[2] memory __coins) public initializer {
        Base.initialize();
        _coins = __coins;
        token = new CurveFiTokenStub();
        token.initialize();
    }

    function add_liquidity(uint256[2] memory amounts, uint256 min_mint_amount)
        public
    {
        uint256 fullAmount;
        for (uint256 i = 0; i < N_COINS; i++) {
            IERC20(_coins[i]).transferFrom(
                _msgSender(),
                address(this),
                amounts[i]
            );
            fullAmount = fullAmount.add(normalizeAmount(_coins[i], amounts[i]));
        }
        (uint256 fee, bool bonus) = calculateExchangeFee(amounts, false);
        if (bonus) {
            fullAmount = fullAmount.add(fee);
        } else {
            fullAmount = fullAmount.sub(fee);
        }
        require(
            fullAmount >= min_mint_amount,
            "CurveFiSwapStub: Requested mint amount is too high"
        );
        require(
            token.mint(_msgSender(), fullAmount),
            "CurveFiSwapStub: Mint failed"
        );
    }

    function add_liquidity_transferFromOnly(
        uint256[2] memory amounts,
        uint256 min_mint_amount
    ) public {
        for (uint256 i = 0; i < N_COINS; i++) {
            IERC20(_coins[i]).transferFrom(
                _msgSender(),
                address(this),
                amounts[i]
            );
        }
    }

    function remove_liquidity(uint256 _amount, uint256[2] memory min_amounts)
        public
    {
        uint256 totalSupply = token.totalSupply();
        uint256[] memory amounts = new uint256[](_coins.length);
        for (uint256 i = 0; i < _coins.length; i++) {
            uint256 balance = balances(int128(i));
            amounts[i] = _amount.mul(balance).div(totalSupply);
            require(
                amounts[i] >= min_amounts[i],
                "CurveFiSwapStub: Requested amount is too high"
            );
            IERC20(_coins[i]).transfer(_msgSender(), amounts[i]);
        }
        token.burnFrom(_msgSender(), _amount);
    }

    function remove_liquidity_imbalance(
        uint256[2] memory amounts,
        uint256 max_burn_amount
    ) public {
        uint256 fullAmount = calc_token_amount(amounts, false);
        for (uint256 i = 0; i < _coins.length; i++) {
            IERC20(_coins[i]).transfer(_msgSender(), amounts[i]);
        }
        require(
            max_burn_amount == 0 || fullAmount <= max_burn_amount,
            "CurveFiSwapStub: Allowed burn amount is not enough"
        );
        token.burnFrom(_msgSender(), fullAmount);
    }

    function calc_token_amount(uint256[2] memory amounts, bool deposit)
        public
        view
        returns (uint256)
    {
        (uint256 fee, bool bonus) = calculateExchangeFee(amounts, deposit);
        uint256 fullAmount;
        for (uint256 i = 0; i < _coins.length; i++) {
            uint256 balance = balances(int128(i));
            require(
                balance >= amounts[i],
                "CurveFiSwapStub: Not enough supply"
            );
            fullAmount = fullAmount.add(amounts[i]);
        }
        if (bonus) {
            fullAmount = fullAmount.sub(fee);
        } else {
            fullAmount = fullAmount.add(fee);
        }
        return fullAmount;
    }

    function balances(int128 i) public view returns (uint256) {
        return IERC20(_coins[uint256(i)]).balanceOf(address(this));
    }

    function A() public view returns (uint256) {
        return 0;
    }

    function fee() public view returns (uint256) {
        return 0;
    }

    function coins(int128 i) public view returns (address) {
        return _coins[uint256(i)];
    }

    function calculateExchangeFee(uint256[2] memory diff, bool deposit)
        internal
        view
        returns (uint256 fullFee, bool bonus)
    {
        uint256 averageAmount = 0;
        uint256[] memory _balances = new uint256[](_coins.length);
        for (uint256 i = 0; i < _coins.length; i++) {
            _balances[i] = balances(int128(i));
            averageAmount = averageAmount.add(_balances[i]);
        }
        averageAmount = averageAmount.div(_coins.length);
        int256 totalFee;
        for (uint256 i = 0; i < _coins.length; i++) {
            int256 oldDiff = int256(_balances[i]) - int256(averageAmount);
            int256 newDiff;
            if (deposit) {
                newDiff = oldDiff + int256(diff[i]);
            } else {
                newDiff = oldDiff - int256(diff[i]);
            }

            uint256 maxFee = diff[i].mul(MAX_EXCHANGE_FEE).div(1e18);
            int256 _fee;
            if (oldDiff == 0) {
                _fee = 0;
            } else {
                if (deposit) {
                    _fee =
                        (int256(MAX_EXCHANGE_FEE) * int256(diff[i])) /
                        oldDiff;
                } else {
                    _fee =
                        (-1 * int256(MAX_EXCHANGE_FEE) * int256(diff[i])) /
                        oldDiff;
                }
            }
            if (_fee > 0 && _fee > int256(maxFee)) _fee = int256(maxFee);
            if (_fee < 0 && -1 * _fee > int256(maxFee))
                _fee = -1 * int256(maxFee);
            totalFee += _fee;
        }
        if (totalFee < 0) {
            bonus = true;
            fullFee = uint256(-1 * totalFee);
        } else {
            bonus = false;
            fullFee = uint256(totalFee);
        }
    }

    function normalizeAmount(address coin, uint256 amount)
        internal
        view
        returns (uint256)
    {
        uint8 decimals = ERC20Detailed(coin).decimals();
        if (decimals < 18) {
            return amount * uint256(10)**(18 - decimals);
        } else if (decimals > 18) {
            return amount / uint256(10)**(decimals - 18);
        } else {
            return amount;
        }
    }
}

// File: contracts/test/CurveFiDepositNoYStub.sol

pragma solidity ^0.5.12;

//import "../interfaces/defi/IYErc20.sol";

contract CurveFiDepositNoYStub is Base, ICurveFiDeposit {
    using SafeMath for uint256;

    uint256 constant EXP_SCALE = 1e18; //Exponential scale (see Compound Exponential)

    uint256 public constant N_COINS = 2;

    CurveFiSwapStub public curveFiSwap;

    CurveFiTokenStub public token;

    address[2] _coins;

    address[2] underlying;

    function initialize(address _curveFiSwap) public initializer {
        Base.initialize();

        curveFiSwap = CurveFiSwapStub(_curveFiSwap);

        token = CurveFiTokenStub(curveFiSwap.token());

        for (uint256 i = 0; i < N_COINS; i++) {
            _coins[i] = curveFiSwap.coins(int128(i));

            underlying[i] = _coins[i]; //IYErc20(_coins[i]).token();
        }
    }

    function add_liquidity(uint256[2] memory uamounts, uint256 min_mint_amount)
        public
    {
        uint256[2] memory amounts = [uint256(0), uint256(0)];

        for (uint256 i = 0; i < uamounts.length; i++) {
            require(
                IERC20(underlying[i]).transferFrom(
                    _msgSender(),
                    address(this),
                    uamounts[i]
                ),
                "CurveFiDepositStub: failed to transfer underlying"
            );

            IYErc20(_coins[i]).deposit(uamounts[i]);

            //amounts[i] = IYErc20(_coins[i]).balanceOf(address(this));

            amounts[i] = IERC20(_coins[i]).balanceOf(address(this));
        }

        curveFiSwap.add_liquidity(amounts, min_mint_amount);

        uint256 shares = token.balanceOf(address(this));

        token.transfer(_msgSender(), shares);
    }

    function remove_liquidity(uint256 _amount, uint256[2] memory min_uamounts)
        public
    {
        token.transferFrom(_msgSender(), address(this), _amount);

        curveFiSwap.remove_liquidity(_amount, [uint256(0), uint256(0)]);

        send_all(_msgSender(), min_uamounts);
    }

    function remove_liquidity_imbalance(
        uint256[2] memory uamounts,
        uint256 max_burn_amount
    ) public {
        uint256[2] memory amounts = [uint256(0), uint256(0)];

        for (uint256 i = 0; i < uamounts.length; i++) {
            //amounts[i] = uamounts[i];.mul(EXP_SCALE).div(IYErc20(_coins[i]).getPricePerFullShare());

            amounts[i] = uamounts[i];
        }

        uint256 shares = token.balanceOf(_msgSender());

        if (shares > max_burn_amount) shares = max_burn_amount;

        token.transferFrom(_msgSender(), address(this), shares);

        curveFiSwap.remove_liquidity_imbalance(amounts, shares);

        shares = token.balanceOf(_msgSender());

        token.transfer(_msgSender(), shares); // Return unused

        send_all(_msgSender(), [uint256(0), uint256(0)]);
    }

    function remove_liquidity_one_coin(
        uint256 _token_amount,
        int128 i,
        uint256 min_uamount
    ) public {
        remove_liquidity_one_coin(_token_amount, i, min_uamount, false);
    }

    function remove_liquidity_one_coin(
        uint256 _token_amount,
        int128 _i,
        uint256 min_uamount,
        bool donate_dust
    ) public {
        uint256[2] memory amounts = [uint256(0), uint256(0)];

        uint256 i = uint256(_i);

        //amounts[i] = min_uamount.mul(EXP_SCALE).div(IYErc20(_coins[i]).getPricePerFullShare());

        amounts[i] = min_uamount;

        curveFiSwap.remove_liquidity_imbalance(amounts, _token_amount);

        uint256[2] memory uamounts = [uint256(0), uint256(0)];

        uamounts[i] = min_uamount;

        send_all(_msgSender(), uamounts);

        if (!donate_dust) {
            uint256 shares = token.balanceOf(address(this));

            token.transfer(_msgSender(), shares);
        }
    }

    function withdraw_donated_dust() public onlyOwner {
        uint256 shares = token.balanceOf(address(this));

        token.transfer(owner(), shares);
    }

    function coins(int128 i) public view returns (address) {
        return _coins[uint256(i)];
    }

    function underlying_coins(int128 i) public view returns (address) {
        return underlying[uint256(i)];
    }

    function curve() public view returns (address) {
        return address(curveFiSwap);
    }

    function calc_withdraw_one_coin(uint256 _token_amount, int128 i)
        public
        view
        returns (uint256)
    {
        return uint256(0).mul(_token_amount.mul(uint256(i))); //we do not use this
    }

    function send_all(address beneficiary, uint256[2] memory min_uamounts)
        internal
    {
        for (uint256 i = 0; i < _coins.length; i++) {
            //uint256 shares = IYErc20(_coins[i]).balanceOf(address(this));

            uint256 shares = IERC20(_coins[i]).balanceOf(address(this));

            if (shares == 0) {
                require(
                    min_uamounts[i] == 0,
                    "CurveFiDepositStub: nothing to withdraw"
                );

                continue;
            }

            //IYErc20(_coins[i]).withdraw(shares);

            uint256 uamount = IERC20(underlying[i]).balanceOf(address(this));

            require(
                uamount >= min_uamounts[i],
                "CurveFiDepositStub: requested amount is too high"
            );

            if (uamount > 0) {
                IERC20(underlying[i]).transfer(beneficiary, uamount);
            }
        }
    }
}
