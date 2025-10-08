// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/CryptoHeir.sol";

contract CryptoHeirTest is Test {
    CryptoHeir public cryptoHeir;

    address public depositor = address(0x1);
    address public beneficiary = address(0x2);
    address public other = address(0x3);

    uint256 public constant DEPOSIT_AMOUNT = 1 ether;
    uint256 public deadline;

    event InheritanceCreated(
        uint256 indexed inheritanceId,
        address indexed depositor,
        address indexed beneficiary,
        uint256 amount,
        uint256 deadline
    );

    event InheritanceClaimed(
        uint256 indexed inheritanceId,
        address indexed beneficiary,
        uint256 amount
    );

    event InheritanceReclaimed(
        uint256 indexed inheritanceId,
        address indexed depositor,
        uint256 amount
    );

    event DeadlineExtended(
        uint256 indexed inheritanceId,
        uint256 oldDeadline,
        uint256 newDeadline
    );

    function setUp() public {
        cryptoHeir = new CryptoHeir();
        deadline = block.timestamp + 30 days;

        // Fund test accounts
        vm.deal(depositor, 10 ether);
        vm.deal(beneficiary, 1 ether);
        vm.deal(other, 1 ether);
    }

    function testDeposit() public {
        vm.startPrank(depositor);

        vm.expectEmit(true, true, true, true);
        emit InheritanceCreated(0, depositor, beneficiary, DEPOSIT_AMOUNT, deadline);

        uint256 inheritanceId = cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(beneficiary, deadline);

        assertEq(inheritanceId, 0);

        (
            address _depositor,
            address _beneficiary,
            uint256 _amount,
            uint256 _deadline,
            bool _claimed
        ) = cryptoHeir.getInheritance(inheritanceId);

        assertEq(_depositor, depositor);
        assertEq(_beneficiary, beneficiary);
        assertEq(_amount, DEPOSIT_AMOUNT);
        assertEq(_deadline, deadline);
        assertFalse(_claimed);

        vm.stopPrank();
    }

    function testDepositRevertsOnZeroAddress() public {
        vm.startPrank(depositor);

        vm.expectRevert(CryptoHeir.InvalidBeneficiary.selector);
        cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(address(0), deadline);

        vm.stopPrank();
    }

    function testDepositRevertsOnSelfBeneficiary() public {
        vm.startPrank(depositor);

        vm.expectRevert(CryptoHeir.InvalidBeneficiary.selector);
        cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(depositor, deadline);

        vm.stopPrank();
    }

    function testDepositRevertsOnPastDeadline() public {
        vm.startPrank(depositor);

        uint256 pastDeadline = block.timestamp - 1;
        vm.expectRevert(CryptoHeir.InvalidDeadline.selector);
        cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(beneficiary, pastDeadline);

        vm.stopPrank();
    }

    function testDepositRevertsOnZeroAmount() public {
        vm.startPrank(depositor);

        vm.expectRevert(CryptoHeir.InsufficientAmount.selector);
        cryptoHeir.deposit{value: 0}(beneficiary, deadline);

        vm.stopPrank();
    }

    function testClaimAfterDeadline() public {
        // Create inheritance
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(beneficiary, deadline);

        // Warp time to after deadline
        vm.warp(deadline + 1);

        uint256 beneficiaryBalanceBefore = beneficiary.balance;

        vm.startPrank(beneficiary);

        vm.expectEmit(true, true, false, true);
        emit InheritanceClaimed(inheritanceId, beneficiary, DEPOSIT_AMOUNT);

        cryptoHeir.claim(inheritanceId);

        vm.stopPrank();

        uint256 beneficiaryBalanceAfter = beneficiary.balance;
        assertEq(beneficiaryBalanceAfter - beneficiaryBalanceBefore, DEPOSIT_AMOUNT);

        (, , , , bool claimed) = cryptoHeir.getInheritance(inheritanceId);
        assertTrue(claimed);
    }

    function testClaimRevertsBeforeDeadline() public {
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(beneficiary, deadline);

        vm.startPrank(beneficiary);

        vm.expectRevert(CryptoHeir.DeadlineNotReached.selector);
        cryptoHeir.claim(inheritanceId);

        vm.stopPrank();
    }

    function testClaimRevertsOnNonBeneficiary() public {
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(beneficiary, deadline);

        vm.warp(deadline + 1);

        vm.startPrank(other);

        vm.expectRevert(CryptoHeir.OnlyBeneficiary.selector);
        cryptoHeir.claim(inheritanceId);

        vm.stopPrank();
    }

    function testClaimRevertsOnAlreadyClaimed() public {
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(beneficiary, deadline);

        vm.warp(deadline + 1);

        vm.startPrank(beneficiary);
        cryptoHeir.claim(inheritanceId);

        vm.expectRevert(CryptoHeir.AlreadyClaimed.selector);
        cryptoHeir.claim(inheritanceId);

        vm.stopPrank();
    }

    function testReclaimBeforeDeadline() public {
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(beneficiary, deadline);

        uint256 depositorBalanceBefore = depositor.balance;

        vm.startPrank(depositor);

        vm.expectEmit(true, true, false, true);
        emit InheritanceReclaimed(inheritanceId, depositor, DEPOSIT_AMOUNT);

        cryptoHeir.reclaim(inheritanceId);

        vm.stopPrank();

        uint256 depositorBalanceAfter = depositor.balance;
        assertEq(depositorBalanceAfter - depositorBalanceBefore, DEPOSIT_AMOUNT);

        (, , , , bool claimed) = cryptoHeir.getInheritance(inheritanceId);
        assertTrue(claimed);
    }

    function testReclaimRevertsAfterDeadline() public {
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(beneficiary, deadline);

        vm.warp(deadline + 1);

        vm.startPrank(depositor);

        vm.expectRevert(CryptoHeir.DeadlineAlreadyPassed.selector);
        cryptoHeir.reclaim(inheritanceId);

        vm.stopPrank();
    }

    function testReclaimRevertsOnNonDepositor() public {
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(beneficiary, deadline);

        vm.startPrank(other);

        vm.expectRevert(CryptoHeir.OnlyDepositor.selector);
        cryptoHeir.reclaim(inheritanceId);

        vm.stopPrank();
    }

    function testReclaimRevertsOnAlreadyClaimed() public {
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(beneficiary, deadline);

        vm.startPrank(depositor);
        cryptoHeir.reclaim(inheritanceId);

        vm.expectRevert(CryptoHeir.AlreadyClaimed.selector);
        cryptoHeir.reclaim(inheritanceId);

        vm.stopPrank();
    }

    function testExtendDeadline() public {
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(beneficiary, deadline);

        uint256 newDeadline = deadline + 30 days;

        vm.startPrank(depositor);

        vm.expectEmit(true, false, false, true);
        emit DeadlineExtended(inheritanceId, deadline, newDeadline);

        cryptoHeir.extendDeadline(inheritanceId, newDeadline);

        vm.stopPrank();

        (, , , uint256 _deadline, ) = cryptoHeir.getInheritance(inheritanceId);
        assertEq(_deadline, newDeadline);
    }

    function testExtendDeadlineRevertsOnPastDeadline() public {
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(beneficiary, deadline);

        uint256 pastDeadline = block.timestamp - 1;

        vm.startPrank(depositor);

        vm.expectRevert(CryptoHeir.InvalidDeadline.selector);
        cryptoHeir.extendDeadline(inheritanceId, pastDeadline);

        vm.stopPrank();
    }

    function testExtendDeadlineRevertsOnNonDepositor() public {
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(beneficiary, deadline);

        uint256 newDeadline = deadline + 30 days;

        vm.startPrank(other);

        vm.expectRevert(CryptoHeir.OnlyDepositor.selector);
        cryptoHeir.extendDeadline(inheritanceId, newDeadline);

        vm.stopPrank();
    }

    function testExtendDeadlineRevertsOnAlreadyClaimed() public {
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(beneficiary, deadline);

        vm.warp(deadline + 1);

        vm.prank(beneficiary);
        cryptoHeir.claim(inheritanceId);

        uint256 newDeadline = deadline + 30 days;

        vm.startPrank(depositor);

        vm.expectRevert(CryptoHeir.AlreadyClaimed.selector);
        cryptoHeir.extendDeadline(inheritanceId, newDeadline);

        vm.stopPrank();
    }

    function testMultipleDeposits() public {
        vm.startPrank(depositor);

        uint256 id1 = cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(beneficiary, deadline);
        uint256 id2 = cryptoHeir.deposit{value: DEPOSIT_AMOUNT * 2}(other, deadline + 10 days);

        assertEq(id1, 0);
        assertEq(id2, 1);
        assertEq(cryptoHeir.nextInheritanceId(), 2);

        vm.stopPrank();
    }

    function testInvalidInheritanceId() public {
        vm.expectRevert(CryptoHeir.InheritanceNotFound.selector);
        cryptoHeir.claim(999);
    }
}
