// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/CryptoHeir.sol";

/**
 * @title CryptoHeirInvariantTest
 * @notice Invariant tests for CryptoHeir contract
 * @dev Tests properties that should always hold true regardless of operation sequence
 */
contract CryptoHeirInvariantTest is Test {
    CryptoHeir public cryptoHeir;
    InvariantTestHandler public handler;

    function setUp() public {
        cryptoHeir = new CryptoHeir();
        handler = new InvariantTestHandler(cryptoHeir);

        // Set handler as target for invariant testing
        targetContract(address(handler));
    }

    /**
     * @notice Invariant: Contract balance should always equal sum of unclaimed inheritances
     */
    function invariant_BalanceMatchesUnclaimedInheritances() public view {
        uint256 expectedBalance = 0;
        uint256 totalInheritances = cryptoHeir.nextInheritanceId();

        for (uint256 i = 0; i < totalInheritances; i++) {
            (, , uint256 amount, , bool claimed) = cryptoHeir.getInheritance(i);
            if (!claimed) {
                expectedBalance += amount;
            }
        }

        assertEq(
            address(cryptoHeir).balance,
            expectedBalance,
            "Contract balance must equal sum of unclaimed inheritances"
        );
    }

    /**
     * @notice Invariant: nextInheritanceId should never decrease
     */
    function invariant_IdMonotonicallyIncreases() public view {
        assertGe(
            cryptoHeir.nextInheritanceId(),
            handler.lastSeenInheritanceId(),
            "Inheritance ID counter should never decrease"
        );
    }

    /**
     * @notice Invariant: Claimed inheritances can never be unclaimed
     */
    function invariant_ClaimedStaysTrue() public view {
        for (uint256 i = 0; i < handler.claimedInheritancesCount(); i++) {
            uint256 id = handler.claimedInheritances(i);
            (, , , , bool claimed) = cryptoHeir.getInheritance(id);
            assertTrue(claimed, "Once claimed, an inheritance must stay claimed");
        }
    }

    /**
     * @notice Invariant: Ghost variable tracking should match actual state
     */
    function invariant_GhostVariablesMatchState() public view {
        // Total deposited should equal: claimed + reclaimed + still in contract
        uint256 totalAccountedFor = handler.totalClaimed() +
                                     handler.totalReclaimed() +
                                     address(cryptoHeir).balance;

        assertEq(
            handler.totalDeposited(),
            totalAccountedFor,
            "Total deposited should equal total claimed + reclaimed + contract balance"
        );
    }

    /**
     * @notice Call summary to see test coverage
     */
    function invariant_callSummary() public view {
        handler.callSummary();
    }
}

/**
 * @title InvariantTestHandler
 * @notice Handler contract for invariant testing
 * @dev Provides controlled randomized interactions with CryptoHeir
 */
contract InvariantTestHandler is Test {
    CryptoHeir public cryptoHeir;

    // Actors
    address[] public depositors;
    address[] public beneficiaries;

    // Ghost variables for tracking
    uint256 public totalDeposited;
    uint256 public totalClaimed;
    uint256 public totalReclaimed;
    uint256 public lastSeenInheritanceId;
    uint256[] public claimedInheritancesList;

    // Call counters for summary
    uint256 public depositCalls;
    uint256 public claimCalls;
    uint256 public reclaimCalls;
    uint256 public extendDeadlineCalls;

    constructor(CryptoHeir _cryptoHeir) {
        cryptoHeir = _cryptoHeir;

        // Initialize actors
        for (uint256 i = 0; i < 5; i++) {
            address depositor = address(uint160(0x1000 + i));
            address beneficiary = address(uint160(0x2000 + i));

            depositors.push(depositor);
            beneficiaries.push(beneficiary);

            vm.deal(depositor, 1000 ether);
            vm.deal(beneficiary, 1 ether);
        }
    }

    /**
     * @notice Create a random deposit
     */
    function deposit(uint256 depositorSeed, uint256 beneficiarySeed, uint96 amount, uint32 daysUntilDeadline) public {
        depositCalls++;

        // Bound inputs
        depositorSeed = bound(depositorSeed, 0, depositors.length - 1);
        beneficiarySeed = bound(beneficiarySeed, 0, beneficiaries.length - 1);
        amount = uint96(bound(uint256(amount), 0.01 ether, 10 ether));
        daysUntilDeadline = uint32(bound(uint256(daysUntilDeadline), 1, 365));

        address depositor = depositors[depositorSeed];
        address beneficiary = beneficiaries[beneficiarySeed];

        // Skip if depositor == beneficiary (invalid)
        if (depositor == beneficiary) return;

        uint256 deadline = block.timestamp + (uint256(daysUntilDeadline) * 1 days);

        vm.prank(depositor);
        try cryptoHeir.deposit{value: amount}(beneficiary, deadline) returns (uint256) {
            totalDeposited += amount;
            lastSeenInheritanceId = cryptoHeir.nextInheritanceId();
        } catch {
            // Invalid deposit, that's okay
        }
    }

    /**
     * @notice Attempt to claim an inheritance
     */
    function claim(uint256 inheritanceId, uint256 timewarpDays) public {
        claimCalls++;

        // Bound inputs
        inheritanceId = bound(inheritanceId, 0, cryptoHeir.nextInheritanceId());
        timewarpDays = bound(timewarpDays, 0, 400);

        // Warp time forward
        vm.warp(block.timestamp + (timewarpDays * 1 days));

        // Try to get inheritance details
        try cryptoHeir.getInheritance(inheritanceId) returns (
            address,
            address beneficiary,
            uint256 amount,
            uint256 deadline,
            bool claimed
        ) {
            if (claimed || block.timestamp < deadline) {
                return; // Can't claim
            }

            vm.prank(beneficiary);
            try cryptoHeir.claim(inheritanceId) {
                totalClaimed += amount;
                claimedInheritancesList.push(inheritanceId);
            } catch {
                // Failed to claim, that's okay
            }
        } catch {
            // Invalid inheritance ID
        }
    }

    /**
     * @notice Attempt to reclaim an inheritance
     */
    function reclaim(uint256 inheritanceId, uint256 timewarpDays) public {
        reclaimCalls++;

        // Bound inputs
        inheritanceId = bound(inheritanceId, 0, cryptoHeir.nextInheritanceId());
        timewarpDays = bound(timewarpDays, 0, 400);

        // Warp time forward
        vm.warp(block.timestamp + (timewarpDays * 1 days));

        // Try to get inheritance details
        try cryptoHeir.getInheritance(inheritanceId) returns (
            address depositor,
            address,
            uint256 amount,
            uint256 deadline,
            bool claimed
        ) {
            if (claimed || block.timestamp >= deadline) {
                return; // Can't reclaim
            }

            vm.prank(depositor);
            try cryptoHeir.reclaim(inheritanceId) {
                totalReclaimed += amount;
                claimedInheritancesList.push(inheritanceId);
            } catch {
                // Failed to reclaim, that's okay
            }
        } catch {
            // Invalid inheritance ID
        }
    }

    /**
     * @notice Attempt to extend a deadline
     */
    function extendDeadline(uint256 inheritanceId, uint32 extensionDays) public {
        extendDeadlineCalls++;

        // Bound inputs
        inheritanceId = bound(inheritanceId, 0, cryptoHeir.nextInheritanceId());
        extensionDays = uint32(bound(uint256(extensionDays), 1, 365));

        // Try to get inheritance details
        try cryptoHeir.getInheritance(inheritanceId) returns (
            address depositor,
            address,
            uint256,
            uint256,
            bool claimed
        ) {
            if (claimed) {
                return; // Can't extend if claimed
            }

            uint256 newDeadline = block.timestamp + (uint256(extensionDays) * 1 days);

            vm.prank(depositor);
            try cryptoHeir.extendDeadline(inheritanceId, newDeadline) {
                // Successfully extended
            } catch {
                // Failed to extend, that's okay
            }
        } catch {
            // Invalid inheritance ID
        }
    }

    // Helper functions
    function claimedInheritancesCount() external view returns (uint256) {
        return claimedInheritancesList.length;
    }

    function claimedInheritances(uint256 index) external view returns (uint256) {
        return claimedInheritancesList[index];
    }

    function callSummary() external view {
        console.log("\n=== Invariant Test Call Summary ===");
        console.log("Total Deposits:", depositCalls);
        console.log("Total Claims:", claimCalls);
        console.log("Total Reclaims:", reclaimCalls);
        console.log("Total Extend Deadlines:", extendDeadlineCalls);
        console.log("---");
        console.log("Total Deposited:", totalDeposited);
        console.log("Total Claimed:", totalClaimed);
        console.log("Total Reclaimed:", totalReclaimed);
        console.log("Active Inheritances:", cryptoHeir.nextInheritanceId());
        console.log("Claimed Inheritances:", claimedInheritancesList.length);
    }
}
