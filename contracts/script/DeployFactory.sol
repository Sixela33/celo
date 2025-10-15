// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {CrowdFundFactory} from "../src/CrowdFundFactory.sol";
import {console2} from "forge-std/console2.sol";

contract DeployFactory is Script {

    address public paymentToken = 0x0000000000000000000000000000000000000000;

    function run() public {
        vm.startBroadcast();
        CrowdFundFactory factory = new CrowdFundFactory(paymentToken);
        console2.log("Factory deployed at", address(factory));
        vm.stopBroadcast();
    }
}