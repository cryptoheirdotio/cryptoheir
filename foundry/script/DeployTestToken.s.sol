// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {TestToken} from "../src/TestToken.sol";

contract DeployTestToken is Script {
    function run() external returns (TestToken) {
        vm.startBroadcast();

        TestToken token = new TestToken();

        console.log("TestToken deployed to:", address(token));
        console.log("Total Supply:", token.totalSupply());
        console.log("Deployer Balance:", token.balanceOf(msg.sender));

        vm.stopBroadcast();

        return token;
    }
}
