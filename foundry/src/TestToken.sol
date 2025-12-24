// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title TestToken
 * @notice A simple ERC20 token for testing purposes
 * @dev Fixed supply of 1,000,000 tokens minted to deployer
 */
contract TestToken is ERC20 {
    /**
     * @notice Constructor that mints initial supply to deployer
     */
    constructor() ERC20("Test Token", "TEST") {
        // Mint 1,000,000 tokens with 18 decimals to the deployer
        _mint(msg.sender, 1_000_000 * 10**decimals());
    }
}
