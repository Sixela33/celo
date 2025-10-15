// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {CrowdFundFactory} from "../src/CrowdFundFactory.sol";
import {GoodDollar} from "../src/GoodDollar.sol";
import {Crowdfund} from "../src/Crowdfund.sol";

contract BasicTests is Test {

    CrowdFundFactory factory;
    GoodDollar goodDollar;

    function setUp() public {
        goodDollar = new GoodDollar();
        factory = new CrowdFundFactory(address(goodDollar));
    }

    function testCreateCrowdfund() public {
        assertEq(factory.paymentToken(), address(goodDollar));
    }

    function testCreateCrowdfundWithFactory() public {
        address crowdfund = factory.createCrowdfund(address(this), 100);
        assertEq(Crowdfund(crowdfund).targetAmount(), 100);
        assertEq(address(Crowdfund(crowdfund).token()), address(goodDollar));
    }

    function testMint() public {
        goodDollar.mint(address(this), 100);
        assertEq(goodDollar.balanceOf(address(this)), 100);
    }

    function testDonate() public {
        // Create crowdfund with target 100 and receiver as this test contract
        address crowdfund = factory.createCrowdfund(address(this), 100);

        // Mint tokens to this contract and approve the crowdfund to pull funds
        goodDollar.mint(address(this), 100);
        assertEq(goodDollar.balanceOf(address(this)), 100);
        goodDollar.approve(crowdfund, 100);

        // Donate 60 first
        Crowdfund(crowdfund).donate(60);
        assertEq(Crowdfund(crowdfund).totalRaised(), 60);
        assertEq(goodDollar.balanceOf(crowdfund), 60);
        assertEq(goodDollar.balanceOf(address(this)), 40);

        // Donate remaining 40 to reach target and complete the crowdfund
        Crowdfund(crowdfund).donate(40);
        assertEq(Crowdfund(crowdfund).isCompleted(), true);
        assertEq(Crowdfund(crowdfund).totalRaised(), 100);
        assertEq(goodDollar.balanceOf(crowdfund), 100);
        assertEq(goodDollar.balanceOf(address(this)), 0);

        // Receiver withdraws all funds
        Crowdfund(crowdfund).withdraw();
        assertEq(goodDollar.balanceOf(crowdfund), 0);
        assertEq(goodDollar.balanceOf(address(this)), 100);
    }
}