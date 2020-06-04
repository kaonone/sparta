pragma solidity ^0.5.12;

/**

        The software and documentation available in this repository (the "Software") is
        protected by copyright law and accessible pursuant to the license set forth below.

        Copyright © 2019 Staked Securely, Inc. All rights reserved.

        Permission is hereby granted, free of charge, to any person or organization
        obtaining the Software (the “Licensee”) to privately study, review, and analyze
        the Software. Licensee shall not use the Software for any other purpose. Licensee
        shall not modify, transfer, assign, share, or sub-license the Software or any
        derivative works of the Software.

        THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
        INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
        PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. IN NO EVENT SHALL THE COPYRIGHT
        HOLDERS BE LIABLE FOR ANY DAMAGES OR OTHER LIABILITY, WHETHER IN CONTRACT, TORT,
        OR OTHERWISE, ARISING FROM, OUT OF, OR IN CONNECTION WITH THE SOFTWARE.

*/

/// @notice  Basic interface for integration with RAY - The Robo-Advisor for Yield.
///
/// Author:   Devan Purhar
/// Version:  1.0.0

interface IRAYNAVCalculator {
    /// @notice  Get the underlying value of a RAY token (principal + yield earnt)
    ///
    /// @dev     The implementation of this function exists in NAVCalculator
    ///
    /// @param   portfolioId - the id of the portfolio associated with the RAY token
    /// @param   tokenId - the id of the RAY token to get the value of
    ///
    /// @return  an array of two, the first value is the current token value, the
    ///          second value is the current price per share of the portfolio
    function getTokenValue(bytes32 portfolioId, bytes32 tokenId) external returns(uint, uint);
}
