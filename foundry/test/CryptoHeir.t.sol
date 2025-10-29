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

    // ============ FUZZ TESTS ============

    function testFuzz_Deposit(uint256 amount, uint256 timeOffset, address fuzzBeneficiary) public {
        // Bound inputs to reasonable ranges
        amount = bound(amount, 1, 1000 ether);
        timeOffset = bound(timeOffset, 1, 365 days);
        vm.assume(fuzzBeneficiary != address(0));
        vm.assume(fuzzBeneficiary != depositor);

        uint256 fuzzDeadline = block.timestamp + timeOffset;

        vm.deal(depositor, amount + 1 ether);
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: amount}(fuzzBeneficiary, fuzzDeadline);

        (
            address _depositor,
            address _beneficiary,
            uint256 _amount,
            uint256 _deadline,
            bool _claimed
        ) = cryptoHeir.getInheritance(inheritanceId);

        assertEq(_depositor, depositor);
        assertEq(_beneficiary, fuzzBeneficiary);
        assertEq(_amount, amount);
        assertEq(_deadline, fuzzDeadline);
        assertFalse(_claimed);
        assertEq(address(cryptoHeir).balance, amount);
    }

    function testFuzz_DepositRejectsInvalidDeadlines(uint256 amount, uint256 invalidDeadline) public {
        amount = bound(amount, 1, 1000 ether);
        // Ensure deadline is always <= block.timestamp (invalid)
        invalidDeadline = bound(invalidDeadline, 0, block.timestamp);

        vm.deal(depositor, amount + 1 ether);
        vm.prank(depositor);
        vm.expectRevert(CryptoHeir.InvalidDeadline.selector);
        cryptoHeir.deposit{value: amount}(beneficiary, invalidDeadline);
    }

    function testFuzz_ClaimAfterDeadline(uint96 amount, uint32 waitTime) public {
        // Use smaller types to avoid overflow
        amount = uint96(bound(uint256(amount), 1 wei, 100 ether));
        waitTime = uint32(bound(uint256(waitTime), 1, 30 days));

        uint256 fuzzDeadline = block.timestamp + 1 days;

        vm.deal(depositor, amount + 1 ether);
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: amount}(beneficiary, fuzzDeadline);

        // Warp to after deadline
        vm.warp(fuzzDeadline + waitTime);

        uint256 balanceBefore = beneficiary.balance;
        vm.prank(beneficiary);
        cryptoHeir.claim(inheritanceId);

        assertEq(beneficiary.balance - balanceBefore, amount);
        (, , , , bool claimed) = cryptoHeir.getInheritance(inheritanceId);
        assertTrue(claimed);
        assertEq(address(cryptoHeir).balance, 0);
    }

    function testFuzz_ClaimRevertsBeforeDeadline(uint96 amount, uint32 timeBeforeDeadline) public {
        amount = uint96(bound(uint256(amount), 1 wei, 100 ether));
        timeBeforeDeadline = uint32(bound(uint256(timeBeforeDeadline), 1, 30 days));

        uint256 fuzzDeadline = block.timestamp + 30 days;

        vm.deal(depositor, amount + 1 ether);
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: amount}(beneficiary, fuzzDeadline);

        // Warp to before deadline
        vm.warp(fuzzDeadline - timeBeforeDeadline);

        vm.prank(beneficiary);
        vm.expectRevert(CryptoHeir.DeadlineNotReached.selector);
        cryptoHeir.claim(inheritanceId);
    }

    function testFuzz_ReclaimBeforeDeadline(uint96 amount, uint32 timeBeforeDeadline) public {
        amount = uint96(bound(uint256(amount), 1 wei, 100 ether));
        timeBeforeDeadline = uint32(bound(uint256(timeBeforeDeadline), 1, 30 days));

        uint256 fuzzDeadline = block.timestamp + 30 days;

        vm.deal(depositor, amount + 1 ether);
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: amount}(beneficiary, fuzzDeadline);

        // Warp to before deadline
        uint256 reclaimTime = fuzzDeadline - timeBeforeDeadline;
        vm.warp(reclaimTime);

        uint256 balanceBefore = depositor.balance;
        vm.prank(depositor);
        cryptoHeir.reclaim(inheritanceId);

        assertEq(depositor.balance - balanceBefore, amount);
        (, , , , bool claimed) = cryptoHeir.getInheritance(inheritanceId);
        assertTrue(claimed);
        assertEq(address(cryptoHeir).balance, 0);
    }

    function testFuzz_ReclaimRevertsAfterDeadline(uint96 amount, uint32 timeAfterDeadline) public {
        amount = uint96(bound(uint256(amount), 1 wei, 100 ether));
        timeAfterDeadline = uint32(bound(uint256(timeAfterDeadline), 1, 30 days));

        uint256 fuzzDeadline = block.timestamp + 1 days;

        vm.deal(depositor, amount + 1 ether);
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: amount}(beneficiary, fuzzDeadline);

        // Warp to after deadline
        vm.warp(fuzzDeadline + timeAfterDeadline);

        vm.prank(depositor);
        vm.expectRevert(CryptoHeir.DeadlineAlreadyPassed.selector);
        cryptoHeir.reclaim(inheritanceId);
    }

    function testFuzz_ExtendDeadline(uint96 amount, uint32 extension) public {
        amount = uint96(bound(uint256(amount), 1 wei, 100 ether));
        extension = uint32(bound(uint256(extension), 1 days, 365 days));

        uint256 initialDeadline = block.timestamp + 30 days;

        vm.deal(depositor, amount + 1 ether);
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: amount}(beneficiary, initialDeadline);

        uint256 newDeadline = block.timestamp + 30 days + extension;

        vm.prank(depositor);
        cryptoHeir.extendDeadline(inheritanceId, newDeadline);

        (, , , uint256 _deadline, ) = cryptoHeir.getInheritance(inheritanceId);
        assertEq(_deadline, newDeadline);
    }

    function testFuzz_MultipleInheritances(uint8 count) public {
        count = uint8(bound(uint256(count), 1, 20));

        vm.deal(depositor, 1000 ether);

        for (uint256 i = 0; i < count; i++) {
            vm.prank(depositor);
            uint256 id = cryptoHeir.deposit{value: 1 ether}(
                beneficiary,
                block.timestamp + 30 days + (i * 1 days)
            );
            assertEq(id, i);
        }

        assertEq(cryptoHeir.nextInheritanceId(), count);
        assertEq(address(cryptoHeir).balance, uint256(count) * 1 ether);
    }

    function testFuzz_ContractBalanceAccounting(uint8 depositCount, uint96 baseAmount) public {
        depositCount = uint8(bound(uint256(depositCount), 1, 10));
        baseAmount = uint96(bound(uint256(baseAmount), 1 wei, 10 ether));

        vm.deal(depositor, type(uint96).max);

        uint256 totalDeposited = 0;

        // Create multiple inheritances
        for (uint256 i = 0; i < depositCount; i++) {
            uint256 amount = baseAmount + (i * 0.1 ether);
            vm.prank(depositor);
            cryptoHeir.deposit{value: amount}(beneficiary, block.timestamp + 30 days);
            totalDeposited += amount;
        }

        // Verify contract balance matches total deposits
        assertEq(address(cryptoHeir).balance, totalDeposited);

        // Warp past deadline and claim all
        vm.warp(block.timestamp + 31 days);

        for (uint256 i = 0; i < depositCount; i++) {
            vm.prank(beneficiary);
            cryptoHeir.claim(i);
        }

        // Verify contract is empty after all claims
        assertEq(address(cryptoHeir).balance, 0);
    }
}
