// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/CryptoHeir.sol";

contract DeployScript is Script {
    function run() external {
        // Try to get private key from environment variable (returns 0 if not set)
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0));

        if (deployerPrivateKey != 0) {
            // Use environment variable if set
            console.log("Using PRIVATE_KEY from environment variable");
            vm.startBroadcast(deployerPrivateKey);
        } else {
            // Fall back to --private-key or --account flag from command line
            console.log("Using --private-key flag from command line");
            vm.startBroadcast();
        }

        CryptoHeir cryptoHeir = new CryptoHeir();

        console.log("CryptoHeir deployed to:", address(cryptoHeir));

        vm.stopBroadcast();
    }
}
