// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {CryptoHeir} from "../src/CryptoHeir.sol";

contract CryptoHeirTest is Test {
    CryptoHeir public cryptoHeir;

    address public depositor = address(0x1);
    address public beneficiary = address(0x2);
    address public other = address(0x3);

    uint256 public constant DEPOSIT_AMOUNT = 1 ether;
    uint256 public deadline;

    // Add receive function to accept fee transfers
    receive() external payable {}

    event InheritanceCreated(
        uint256 indexed inheritanceId,
        address indexed depositor,
        address indexed beneficiary,
        address token,
        uint256 amount,
        uint256 deadline
    );

    event InheritanceClaimed(
        uint256 indexed inheritanceId,
        address indexed beneficiary,
        address token,
        uint256 amount
    );

    event InheritanceReclaimed(
        uint256 indexed inheritanceId,
        address indexed depositor,
        address token,
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
        // After 0.1% deposit fee, net amount is 99.9% of deposit
        uint256 netAmount = DEPOSIT_AMOUNT - (DEPOSIT_AMOUNT / 1000);

        vm.expectEmit(true, true, true, true);
        emit InheritanceCreated(0, depositor, beneficiary, address(0), netAmount, deadline);

        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(address(0), beneficiary, DEPOSIT_AMOUNT, deadline);

        assertEq(inheritanceId, 0);

        (
            address _depositor,
            address _beneficiary,
            address _token,
            uint256 _amount,
            uint256 _deadline,
            bool _claimed
        ) = cryptoHeir.getInheritance(inheritanceId);

        assertEq(_depositor, depositor);
        assertEq(_beneficiary, beneficiary);
        assertEq(_token, address(0));
        assertEq(_amount, netAmount);
        assertEq(_deadline, deadline);
        assertFalse(_claimed);
    }

    function testDepositRevertsOnZeroAddress() public {
        vm.expectRevert(CryptoHeir.InvalidBeneficiary.selector);
        vm.prank(depositor);
        cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(address(0), address(0), DEPOSIT_AMOUNT, deadline);
    }

    function testDepositRevertsOnSelfBeneficiary() public {
        vm.expectRevert(CryptoHeir.InvalidBeneficiary.selector);
        vm.prank(depositor);
        cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(address(0), depositor, DEPOSIT_AMOUNT, deadline);
    }

    function testDepositRevertsOnPastDeadline() public {
        uint256 pastDeadline = block.timestamp - 1;
        vm.expectRevert(CryptoHeir.InvalidDeadline.selector);
        vm.prank(depositor);
        cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(address(0), beneficiary, DEPOSIT_AMOUNT, pastDeadline);
    }

    function testDepositRevertsOnZeroAmount() public {
        vm.expectRevert(CryptoHeir.InsufficientAmount.selector);
        vm.prank(depositor);
        cryptoHeir.deposit{value: 0}(address(0), beneficiary, 0, deadline);
    }

    function testClaimAfterDeadline() public {
        // Create inheritance
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(address(0), beneficiary, DEPOSIT_AMOUNT, deadline);

        // Warp time to after deadline
        vm.warp(deadline + 1);

        uint256 beneficiaryBalanceBefore = beneficiary.balance;

        // Calculate expected amounts
        uint256 netAmountAfterDeposit = DEPOSIT_AMOUNT - (DEPOSIT_AMOUNT / 1000); // 99.9%
        uint256 claimAmount = netAmountAfterDeposit - (netAmountAfterDeposit / 100); // 99% of stored

        vm.expectEmit(true, true, false, true);
        emit InheritanceClaimed(inheritanceId, beneficiary, address(0), claimAmount);

        vm.prank(beneficiary);
        cryptoHeir.claim(inheritanceId);

        uint256 beneficiaryBalanceAfter = beneficiary.balance;
        assertEq(beneficiaryBalanceAfter - beneficiaryBalanceBefore, claimAmount);

        (, , , , , bool claimed) = cryptoHeir.getInheritance(inheritanceId);
        assertTrue(claimed);
    }

    function testClaimRevertsBeforeDeadline() public {
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(address(0), beneficiary, DEPOSIT_AMOUNT, deadline);

        vm.expectRevert(CryptoHeir.DeadlineNotReached.selector);
        vm.prank(beneficiary);
        cryptoHeir.claim(inheritanceId);
    }

    function testClaimRevertsOnNonBeneficiary() public {
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(address(0), beneficiary, DEPOSIT_AMOUNT, deadline);

        vm.warp(deadline + 1);

        vm.expectRevert(CryptoHeir.OnlyBeneficiary.selector);
        vm.prank(other);
        cryptoHeir.claim(inheritanceId);
    }

    function testClaimRevertsOnAlreadyClaimed() public {
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(address(0), beneficiary, DEPOSIT_AMOUNT, deadline);

        vm.warp(deadline + 1);

        vm.startPrank(beneficiary);
        cryptoHeir.claim(inheritanceId);

        vm.expectRevert(CryptoHeir.AlreadyClaimed.selector);
        cryptoHeir.claim(inheritanceId);

        vm.stopPrank();
    }

    function testReclaimBeforeDeadline() public {
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(address(0), beneficiary, DEPOSIT_AMOUNT, deadline);

        uint256 depositorBalanceBefore = depositor.balance;

        // Calculate expected reclaim amount (stored amount after deposit fee, no additional fee on reclaim)
        uint256 reclaimAmount = DEPOSIT_AMOUNT - (DEPOSIT_AMOUNT / 1000); // 99.9%

        vm.expectEmit(true, true, false, true);
        emit InheritanceReclaimed(inheritanceId, depositor, address(0), reclaimAmount);

        vm.prank(depositor);
        cryptoHeir.reclaim(inheritanceId);

        uint256 depositorBalanceAfter = depositor.balance;
        assertEq(depositorBalanceAfter - depositorBalanceBefore, reclaimAmount);

        (, , , , , bool claimed) = cryptoHeir.getInheritance(inheritanceId);
        assertTrue(claimed);
    }

    function testReclaimRevertsAfterDeadline() public {
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(address(0), beneficiary, DEPOSIT_AMOUNT, deadline);

        vm.warp(deadline + 1);

        vm.expectRevert(CryptoHeir.DeadlineAlreadyPassed.selector);
        vm.prank(depositor);
        cryptoHeir.reclaim(inheritanceId);
    }

    function testReclaimRevertsOnNonDepositor() public {
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(address(0), beneficiary, DEPOSIT_AMOUNT, deadline);

        vm.expectRevert(CryptoHeir.OnlyDepositor.selector);
        vm.prank(other);
        cryptoHeir.reclaim(inheritanceId);
    }

    function testReclaimRevertsOnAlreadyClaimed() public {
        vm.startPrank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(address(0), beneficiary, DEPOSIT_AMOUNT, deadline);

        cryptoHeir.reclaim(inheritanceId);

        vm.expectRevert(CryptoHeir.AlreadyClaimed.selector);
        cryptoHeir.reclaim(inheritanceId);

        vm.stopPrank();
    }

    function testExtendDeadline() public {
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(address(0), beneficiary, DEPOSIT_AMOUNT, deadline);

        uint256 newDeadline = deadline + 30 days;

        vm.expectEmit(true, false, false, true);
        emit DeadlineExtended(inheritanceId, deadline, newDeadline);

        vm.prank(depositor);
        cryptoHeir.extendDeadline(inheritanceId, newDeadline);

        (, , , , uint256 _deadline, ) = cryptoHeir.getInheritance(inheritanceId);
        assertEq(_deadline, newDeadline);
    }

    function testExtendDeadlineRevertsOnPastDeadline() public {
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(address(0), beneficiary, DEPOSIT_AMOUNT, deadline);

        uint256 pastDeadline = block.timestamp - 1;

        vm.expectRevert(CryptoHeir.InvalidDeadline.selector);
        vm.prank(depositor);
        cryptoHeir.extendDeadline(inheritanceId, pastDeadline);
    }

    function testExtendDeadlineRevertsOnNonDepositor() public {
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(address(0), beneficiary, DEPOSIT_AMOUNT, deadline);

        uint256 newDeadline = deadline + 30 days;

        vm.expectRevert(CryptoHeir.OnlyDepositor.selector);
        vm.prank(other);
        cryptoHeir.extendDeadline(inheritanceId, newDeadline);
    }

    function testExtendDeadlineRevertsOnAlreadyClaimed() public {
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(address(0), beneficiary, DEPOSIT_AMOUNT, deadline);

        vm.warp(deadline + 1);

        vm.prank(beneficiary);
        cryptoHeir.claim(inheritanceId);

        uint256 newDeadline = deadline + 30 days;

        vm.expectRevert(CryptoHeir.AlreadyClaimed.selector);
        vm.prank(depositor);
        cryptoHeir.extendDeadline(inheritanceId, newDeadline);
    }

    function testMultipleDeposits() public {
        vm.startPrank(depositor);

        uint256 id1 = cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(address(0), beneficiary, DEPOSIT_AMOUNT, deadline);
        uint256 id2 = cryptoHeir.deposit{value: DEPOSIT_AMOUNT * 2}(address(0), other, DEPOSIT_AMOUNT * 2, deadline + 10 days);

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
        uint256 inheritanceId = cryptoHeir.deposit{value: amount}(address(0), fuzzBeneficiary, amount, fuzzDeadline);

        // Calculate expected net amount after 0.1% deposit fee
        uint256 netAmount = amount - (amount / 1000);

        (
            address _depositor,
            address _beneficiary,
            address _token,
            uint256 _amount,
            uint256 _deadline,
            bool _claimed
        ) = cryptoHeir.getInheritance(inheritanceId);

        assertEq(_depositor, depositor);
        assertEq(_beneficiary, fuzzBeneficiary);
        assertEq(_token, address(0));
        assertEq(_amount, netAmount);
        assertEq(_deadline, fuzzDeadline);
        assertFalse(_claimed);
        assertEq(address(cryptoHeir).balance, netAmount);
    }

    function testFuzz_DepositRejectsInvalidDeadlines(uint256 amount, uint256 invalidDeadline) public {
        amount = bound(amount, 1, 1000 ether);
        // Ensure deadline is always <= block.timestamp (invalid)
        invalidDeadline = bound(invalidDeadline, 0, block.timestamp);

        vm.deal(depositor, amount + 1 ether);
        vm.prank(depositor);
        vm.expectRevert(CryptoHeir.InvalidDeadline.selector);
        cryptoHeir.deposit{value: amount}(address(0), beneficiary, amount, invalidDeadline);
    }

    function testFuzz_ClaimAfterDeadline(uint96 amount, uint32 waitTime) public {
        // Use smaller types to avoid overflow
        amount = uint96(bound(uint256(amount), 1 wei, 100 ether));
        waitTime = uint32(bound(uint256(waitTime), 1, 30 days));

        uint256 fuzzDeadline = block.timestamp + 1 days;

        vm.deal(depositor, amount + 1 ether);
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: amount}(address(0), beneficiary, amount, fuzzDeadline);

        // Calculate expected amounts
        uint256 netAmountAfterDeposit = amount - (amount / 1000); // 99.9% after deposit fee
        uint256 claimAmount = netAmountAfterDeposit - (netAmountAfterDeposit / 100); // 99% of stored

        // Warp to after deadline
        vm.warp(fuzzDeadline + waitTime);

        uint256 balanceBefore = beneficiary.balance;
        vm.prank(beneficiary);
        cryptoHeir.claim(inheritanceId);

        assertEq(beneficiary.balance - balanceBefore, claimAmount);
        (, , , , , bool claimed) = cryptoHeir.getInheritance(inheritanceId);
        assertTrue(claimed);
        assertEq(address(cryptoHeir).balance, 0);
    }

    function testFuzz_ClaimRevertsBeforeDeadline(uint96 amount, uint32 timeBeforeDeadline) public {
        amount = uint96(bound(uint256(amount), 1 wei, 100 ether));
        timeBeforeDeadline = uint32(bound(uint256(timeBeforeDeadline), 1, 30 days));

        uint256 fuzzDeadline = block.timestamp + 30 days;

        vm.deal(depositor, amount + 1 ether);
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: amount}(address(0), beneficiary, amount, fuzzDeadline);

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
        uint256 inheritanceId = cryptoHeir.deposit{value: amount}(address(0), beneficiary, amount, fuzzDeadline);

        // Calculate expected reclaim amount (stored amount after deposit fee, no additional fee)
        uint256 reclaimAmount = amount - (amount / 1000); // 99.9%

        // Warp to before deadline
        uint256 reclaimTime = fuzzDeadline - timeBeforeDeadline;
        vm.warp(reclaimTime);

        uint256 balanceBefore = depositor.balance;
        vm.prank(depositor);
        cryptoHeir.reclaim(inheritanceId);

        assertEq(depositor.balance - balanceBefore, reclaimAmount);
        (, , , , , bool claimed) = cryptoHeir.getInheritance(inheritanceId);
        assertTrue(claimed);
        assertEq(address(cryptoHeir).balance, 0);
    }

    function testFuzz_ReclaimRevertsAfterDeadline(uint96 amount, uint32 timeAfterDeadline) public {
        amount = uint96(bound(uint256(amount), 1 wei, 100 ether));
        timeAfterDeadline = uint32(bound(uint256(timeAfterDeadline), 1, 30 days));

        uint256 fuzzDeadline = block.timestamp + 1 days;

        vm.deal(depositor, amount + 1 ether);
        vm.prank(depositor);
        uint256 inheritanceId = cryptoHeir.deposit{value: amount}(address(0), beneficiary, amount, fuzzDeadline);

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
        uint256 inheritanceId = cryptoHeir.deposit{value: amount}(address(0), beneficiary, amount, initialDeadline);

        uint256 newDeadline = block.timestamp + 30 days + extension;

        vm.prank(depositor);
        cryptoHeir.extendDeadline(inheritanceId, newDeadline);

        (, , , , uint256 _deadline, ) = cryptoHeir.getInheritance(inheritanceId);
        assertEq(_deadline, newDeadline);
    }

    function testFuzz_MultipleInheritances(uint8 count) public {
        count = uint8(bound(uint256(count), 1, 20));

        vm.deal(depositor, 1000 ether);

        for (uint256 i = 0; i < count; i++) {
            vm.prank(depositor);
            uint256 id = cryptoHeir.deposit{value: 1 ether}(
                address(0),
                beneficiary,
                1 ether,
                block.timestamp + 30 days + (i * 1 days)
            );
            assertEq(id, i);
        }

        assertEq(cryptoHeir.nextInheritanceId(), count);
        // Calculate net amount after deposit fees (99.9% per deposit)
        uint256 netPerDeposit = 1 ether - (1 ether / 1000);
        assertEq(address(cryptoHeir).balance, uint256(count) * netPerDeposit);
    }

    function testFuzz_ContractBalanceAccounting(uint8 depositCount, uint96 baseAmount) public {
        depositCount = uint8(bound(uint256(depositCount), 1, 10));
        baseAmount = uint96(bound(uint256(baseAmount), 1 wei, 10 ether));

        vm.deal(depositor, type(uint96).max);

        uint256 totalStoredInContract = 0;

        // Create multiple inheritances
        for (uint256 i = 0; i < depositCount; i++) {
            uint256 amount = baseAmount + (i * 0.1 ether);
            vm.prank(depositor);
            cryptoHeir.deposit{value: amount}(address(0), beneficiary, amount, block.timestamp + 30 days);
            // Calculate net amount stored in contract after deposit fee
            uint256 netAmount = amount - (amount / 1000);
            totalStoredInContract += netAmount;
        }

        // Verify contract balance matches total net deposits (after deposit fees)
        assertEq(address(cryptoHeir).balance, totalStoredInContract);

        // Warp past deadline and claim all
        vm.warp(block.timestamp + 31 days);

        for (uint256 i = 0; i < depositCount; i++) {
            vm.prank(beneficiary);
            cryptoHeir.claim(i);
        }

        // Verify contract is empty after all claims
        assertEq(address(cryptoHeir).balance, 0);
    }

    // ============ FEE COLLECTOR TRANSFER TESTS ============

    function testFeeCollectorTransferSuccessful() public {
        address newCollector = address(0x9999);
        address initialCollector = address(this);

        // Verify initial fee collector
        assertEq(cryptoHeir.feeCollector(), initialCollector);

        // Initiate transfer
        cryptoHeir.transferFeeCollector(newCollector);

        // Verify pending collector is set
        assertEq(cryptoHeir.pendingFeeCollector(), newCollector);
        assertEq(cryptoHeir.feeCollector(), initialCollector); // Still the old one

        // Accept transfer as new collector
        vm.prank(newCollector);
        cryptoHeir.acceptFeeCollector();

        // Verify transfer completed
        assertEq(cryptoHeir.feeCollector(), newCollector);
        assertEq(cryptoHeir.pendingFeeCollector(), address(0));
    }

    function testFeeCollectorTransferRevertsOnlyCurrentCollector() public {
        address newCollector = address(0x9999);

        // Try to transfer from non-fee-collector address
        vm.expectRevert(CryptoHeir.OnlyFeeCollector.selector);
        vm.prank(depositor);
        cryptoHeir.transferFeeCollector(newCollector);
    }

    function testFeeCollectorTransferRevertsZeroAddress() public {
        vm.expectRevert(CryptoHeir.InvalidFeeCollector.selector);
        cryptoHeir.transferFeeCollector(address(0));
    }

    function testFeeCollectorAcceptRevertsOnlyPending() public {
        address newCollector = address(0x9999);
        address wrongAddress = address(0x8888);

        // Initiate transfer
        cryptoHeir.transferFeeCollector(newCollector);

        // Try to accept from wrong address
        vm.expectRevert(CryptoHeir.NoPendingTransfer.selector);
        vm.prank(wrongAddress);
        cryptoHeir.acceptFeeCollector();
    }

    function testFeeCollectorAcceptRevertsNoPending() public {
        // Try to accept when no pending transfer
        vm.expectRevert(CryptoHeir.NoPendingTransfer.selector);
        cryptoHeir.acceptFeeCollector();
    }

    function testFeesGoToCurrentCollectorDuringPendingTransfer() public {
        address newCollector = address(0x9999);
        vm.deal(newCollector, 1 ether);

        // Initiate transfer
        cryptoHeir.transferFeeCollector(newCollector);

        uint256 initialBalance = address(this).balance;

        // Make a deposit while transfer is pending
        vm.prank(depositor);
        cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(address(0), beneficiary, DEPOSIT_AMOUNT, deadline);

        // Verify fees went to current collector (not pending)
        uint256 expectedFee = DEPOSIT_AMOUNT / 1000;
        assertEq(address(this).balance - initialBalance, expectedFee);

        // Verify new collector didn't receive fees
        assertEq(newCollector.balance, 1 ether);
    }

    function testFeesGoToNewCollectorAfterTransfer() public {
        address newCollector = address(0x9999);
        vm.deal(newCollector, 1 ether);

        // Complete transfer
        cryptoHeir.transferFeeCollector(newCollector);
        vm.prank(newCollector);
        cryptoHeir.acceptFeeCollector();

        // Make a deposit after transfer
        vm.prank(depositor);
        cryptoHeir.deposit{value: DEPOSIT_AMOUNT}(address(0), beneficiary, DEPOSIT_AMOUNT, deadline);

        // Verify fees went to new collector
        uint256 expectedFee = DEPOSIT_AMOUNT / 1000;
        assertEq(newCollector.balance, 1 ether + expectedFee);
    }

    function testFeeCollectorCanBeTransferredMultipleTimes() public {
        address collector2 = address(0x9999);
        address collector3 = address(0x8888);

        // First transfer
        cryptoHeir.transferFeeCollector(collector2);
        vm.prank(collector2);
        cryptoHeir.acceptFeeCollector();

        assertEq(cryptoHeir.feeCollector(), collector2);

        // Second transfer (from new collector)
        vm.prank(collector2);
        cryptoHeir.transferFeeCollector(collector3);

        vm.prank(collector3);
        cryptoHeir.acceptFeeCollector();

        assertEq(cryptoHeir.feeCollector(), collector3);
    }

    function testFeeCollectorCanChangeMindsBeforeAcceptance() public {
        address firstChoice = address(0x9999);
        address secondChoice = address(0x8888);

        // Propose first collector
        cryptoHeir.transferFeeCollector(firstChoice);
        assertEq(cryptoHeir.pendingFeeCollector(), firstChoice);

        // Change mind and propose different collector (overwrites)
        cryptoHeir.transferFeeCollector(secondChoice);
        assertEq(cryptoHeir.pendingFeeCollector(), secondChoice);

        // First choice can no longer accept
        vm.expectRevert(CryptoHeir.NoPendingTransfer.selector);
        vm.prank(firstChoice);
        cryptoHeir.acceptFeeCollector();

        // Second choice can accept
        vm.prank(secondChoice);
        cryptoHeir.acceptFeeCollector();

        assertEq(cryptoHeir.feeCollector(), secondChoice);
        assertEq(cryptoHeir.pendingFeeCollector(), address(0));
    }
}
