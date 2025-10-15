// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Crowdfund} from "./Crowdfund.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CrowdFundFactory {

    address public paymentToken;
    address[] public crowdfunds;

    event CrowdfundCreated(address indexed crowdfund, address indexed creator);

    constructor(address _paymentToken) {
        paymentToken = _paymentToken;
    }

    function createCrowdfund(address _receiverAddress, uint256 _targetAmount) public returns (address) {
        Crowdfund crowdfund = new Crowdfund(_receiverAddress, _targetAmount, ERC20(paymentToken));
        crowdfunds.push(address(crowdfund));
        emit CrowdfundCreated(address(crowdfund), msg.sender);
        return address(crowdfund);
    }

    function getCrowdfunds() public view returns (address[] memory) {
        return crowdfunds;
    }
}