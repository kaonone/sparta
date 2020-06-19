pragma solidity ^0.5.12;

/**
 * @dev List of module names
 */
contract ModuleNames {
    // Pool Modules
    string internal constant MODULE_ACCESS            = "access";
    string internal constant MODULE_PTOKEN            = "ptoken";
    string internal constant MODULE_DEFI              = "defi";
    string internal constant MODULE_CURVE             = "curve";
    string internal constant MODULE_FUNDS             = "funds";
    string internal constant MODULE_LIQUIDITY         = "liquidity";
    string internal constant MODULE_LOAN              = "loan";
    string internal constant MODULE_LOAN_LIMTS        = "loan_limits";
    string internal constant MODULE_LOAN_PROPOSALS    = "loan_proposals";

    // External Modules (used to store addresses of external contracts)
    string internal constant MODULE_RAY               = "ray";
}
