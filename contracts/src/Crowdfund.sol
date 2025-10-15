// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

contract Crowdfund {
    using SafeERC20 for ERC20;

    address public receiverAddress;
    uint256 public targetAmount;
    ERC20 public token;
    bool public isCompleted;
    uint256 public totalRaised;

    event Donated(address indexed donor, uint256 amount);
    event Withdrawn(address indexed recipient, uint256 amount);

    constructor(address _receiverAddress, uint256 _targetAmount, ERC20 _token) {
        receiverAddress = _receiverAddress;
        targetAmount = _targetAmount;
        token = _token;
    }

    function donate(uint256 amount) external {
        require(!isCompleted, "Crowdfund completed");
        require(amount > 0, "Amount must be > 0");
        // Pull tokens from donor into this contract
        token.safeTransferFrom(msg.sender, address(this), amount);
        amount = Math.min(amount, targetAmount);
        totalRaised += amount;
        if (totalRaised >= targetAmount) {
            isCompleted = true;
        }
        emit Donated(msg.sender, amount);
    }

    function withdraw() public {
        require(isCompleted, "Crowdfund not completed");
        require(msg.sender == receiverAddress, "Only receiver");
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No funds to withdraw");
        token.safeTransfer(receiverAddress, balance);
        emit Withdrawn(receiverAddress, balance);
    }
}
