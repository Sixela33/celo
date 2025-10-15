// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {CrowdFundFactory} from "../src/CrowdFundFactory.sol";
import {console2} from "forge-std/console2.sol";
import {GoodDollar} from "../src/GoodDollar.sol";

contract DeployFactory is Script {

    address public paymentToken = 0x0000000000000000000000000000000000000000;

    function run() public {
        vm.startBroadcast();
        if (paymentToken == address(0)) {
            paymentToken = address(new GoodDollar());
        }
        CrowdFundFactory factory = new CrowdFundFactory(paymentToken);
        console2.log("Factory deployed at", address(factory));
        console2.log("Payment token deployed at", address(paymentToken));
        vm.stopBroadcast();
    }
}