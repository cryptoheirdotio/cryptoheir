// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title CryptoHeir
 * @notice A time-locked fund transfer contract allowing deposits with deadlines
 * @dev Supports deposit, claim, reclaim, and deadline extension for both native and ERC20 tokens
 */
contract CryptoHeir is ReentrancyGuardTransient {
    using SafeERC20 for IERC20;

    // Fee collector who receives fees
    address public feeCollector;

    // Pending fee collector for two-step transfer
    address private _pendingFeeCollector;

    struct Inheritance {
        address depositor;
        address beneficiary;
        address token; // address(0) for native token, ERC20 address otherwise
        uint256 amount;
        uint256 deadline;
        bool claimed;
    }

    // Mapping from inheritance ID to Inheritance struct
    mapping(uint256 => Inheritance) public inheritances;

    // Counter for generating unique inheritance IDs
    uint256 public nextInheritanceId;

    // Events
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

    event FeeCollected(
        address indexed collector,
        address token,
        uint256 amount,
        string feeType
    );

    event FeeCollectorTransferStarted(
        address indexed currentCollector,
        address indexed pendingCollector
    );

    event FeeCollectorTransferred(
        address indexed previousCollector,
        address indexed newCollector
    );

    // Errors
    error InvalidBeneficiary();
    error InvalidDeadline();
    error InsufficientAmount();
    error InvalidTokenTransfer();
    error InheritanceNotFound();
    error AlreadyClaimed();
    error DeadlineNotReached();
    error DeadlineAlreadyPassed();
    error OnlyDepositor();
    error OnlyBeneficiary();
    error OnlyFeeCollector();
    error InvalidFeeCollector();
    error NoPendingTransfer();

    /**
     * @notice Constructor sets the initial fee collector to the deployer
     */
    constructor() {
        feeCollector = msg.sender;
    }

    /**
     * @notice Deposit funds for a beneficiary with a deadline
     * @param _token Token address (address(0) for native token)
     * @param _beneficiary Address that can claim the funds after deadline
     * @param _amount Amount to deposit (for ERC20 tokens, ignored for native token)
     * @param _deadline Timestamp when funds become claimable
     * @return inheritanceId The unique ID of the created inheritance
     */
    function deposit(address _token, address _beneficiary, uint256 _amount, uint256 _deadline)
        external
        payable
        nonReentrant
        returns (uint256)
    {
        // CHECKS - Input validation
        if (_beneficiary == address(0)) revert InvalidBeneficiary();
        if (_beneficiary == msg.sender) revert InvalidBeneficiary();
        if (_deadline <= block.timestamp) revert InvalidDeadline();

        uint256 amount;
        uint256 depositFee;
        uint256 netAmount;

        if (_token == address(0)) {
            // Native token deposit
            if (msg.value == 0) revert InsufficientAmount();
            amount = msg.value;
        } else {
            // ERC20 token deposit
            if (_amount == 0) revert InsufficientAmount();
            if (msg.value != 0) revert InvalidTokenTransfer();
            amount = _amount;
        }

        // Calculate 0.1% fee
        depositFee = amount / 1000;
        netAmount = amount - depositFee;

        // EFFECTS - State changes before external calls
        uint256 inheritanceId = nextInheritanceId++;

        inheritances[inheritanceId] = Inheritance({
            depositor: msg.sender,
            beneficiary: _beneficiary,
            token: _token,
            amount: netAmount,
            deadline: _deadline,
            claimed: false
        });

        emit FeeCollected(feeCollector, _token, depositFee, "deposit");
        emit InheritanceCreated(inheritanceId, msg.sender, _beneficiary, _token, netAmount, _deadline);

        // INTERACTIONS - External calls last
        if (_token == address(0)) {
            // Transfer fee to fee collector
            (bool success, ) = feeCollector.call{value: depositFee}("");
            require(success, "Fee transfer failed");
        } else {
            // Transfer tokens from sender to this contract
            IERC20(_token).safeTransferFrom(msg.sender, address(this), amount);

            // Transfer fee to fee collector
            IERC20(_token).safeTransfer(feeCollector, depositFee);
        }

        return inheritanceId;
    }

    /**
     * @notice Claim funds after the deadline has passed (beneficiary only)
     * @param _inheritanceId The ID of the inheritance to claim
     */
    function claim(uint256 _inheritanceId) external nonReentrant {
        Inheritance storage inheritance = inheritances[_inheritanceId];

        if (inheritance.depositor == address(0)) revert InheritanceNotFound();
        if (inheritance.claimed) revert AlreadyClaimed();
        if (msg.sender != inheritance.beneficiary) revert OnlyBeneficiary();
        if (block.timestamp < inheritance.deadline) revert DeadlineNotReached();

        inheritance.claimed = true;
        address token = inheritance.token;
        uint256 amount = inheritance.amount;

        // Calculate 1% claim fee
        uint256 claimFee = amount / 100;
        uint256 netAmount = amount - claimFee;

        emit InheritanceClaimed(_inheritanceId, msg.sender, token, netAmount);
        emit FeeCollected(feeCollector, token, claimFee, "claim");

        if (token == address(0)) {
            // Transfer fee to fee collector
            (bool feeSuccess, ) = feeCollector.call{value: claimFee}("");
            require(feeSuccess, "Fee transfer failed");

            // Transfer remaining to beneficiary
            (bool success, ) = msg.sender.call{value: netAmount}("");
            require(success, "Transfer failed");
        } else {
            // Transfer fee to fee collector
            IERC20(token).safeTransfer(feeCollector, claimFee);

            // Transfer remaining to beneficiary
            IERC20(token).safeTransfer(msg.sender, netAmount);
        }
    }

    /**
     * @notice Reclaim funds before the deadline (depositor only)
     * @param _inheritanceId The ID of the inheritance to reclaim
     */
    function reclaim(uint256 _inheritanceId) external nonReentrant {
        Inheritance storage inheritance = inheritances[_inheritanceId];

        if (inheritance.depositor == address(0)) revert InheritanceNotFound();
        if (inheritance.claimed) revert AlreadyClaimed();
        if (msg.sender != inheritance.depositor) revert OnlyDepositor();
        if (block.timestamp >= inheritance.deadline) revert DeadlineAlreadyPassed();

        inheritance.claimed = true;
        address token = inheritance.token;
        uint256 amount = inheritance.amount;

        emit InheritanceReclaimed(_inheritanceId, msg.sender, token, amount);

        if (token == address(0)) {
            // Transfer native token
            (bool success, ) = msg.sender.call{value: amount}("");
            require(success, "Transfer failed");
        } else {
            // Transfer ERC20 token
            IERC20(token).safeTransfer(msg.sender, amount);
        }
    }

    /**
     * @notice Extend the deadline (depositor only)
     * @param _inheritanceId The ID of the inheritance
     * @param _newDeadline The new deadline (must be in the future)
     */
    function extendDeadline(uint256 _inheritanceId, uint256 _newDeadline) external {
        Inheritance storage inheritance = inheritances[_inheritanceId];

        if (inheritance.depositor == address(0)) revert InheritanceNotFound();
        if (inheritance.claimed) revert AlreadyClaimed();
        if (msg.sender != inheritance.depositor) revert OnlyDepositor();
        if (_newDeadline <= block.timestamp) revert InvalidDeadline();

        uint256 oldDeadline = inheritance.deadline;
        inheritance.deadline = _newDeadline;

        emit DeadlineExtended(_inheritanceId, oldDeadline, _newDeadline);
    }

    /**
     * @notice Initiate fee collector transfer (two-step process)
     * @param newFeeCollector The address of the new fee collector
     * @dev Only current fee collector can call this. New collector must accept.
     */
    function transferFeeCollector(address newFeeCollector) external {
        if (msg.sender != feeCollector) revert OnlyFeeCollector();
        if (newFeeCollector == address(0)) revert InvalidFeeCollector();

        _pendingFeeCollector = newFeeCollector;
        emit FeeCollectorTransferStarted(feeCollector, newFeeCollector);
    }

    /**
     * @notice Accept fee collector role (completes two-step transfer)
     * @dev Only pending fee collector can call this
     */
    function acceptFeeCollector() external {
        if (msg.sender != _pendingFeeCollector) revert NoPendingTransfer();

        address previousCollector = feeCollector;
        feeCollector = _pendingFeeCollector;
        _pendingFeeCollector = address(0);

        emit FeeCollectorTransferred(previousCollector, feeCollector);
    }

    /**
     * @notice Get the pending fee collector address
     * @return The address of the pending fee collector (address(0) if none)
     */
    function pendingFeeCollector() external view returns (address) {
        return _pendingFeeCollector;
    }

    /**
     * @notice Get details of an inheritance
     * @param _inheritanceId The ID of the inheritance
     * @return depositor The address of the depositor
     * @return beneficiary The address of the beneficiary
     * @return token The token address (address(0) for native token)
     * @return amount The amount deposited
     * @return deadline The deadline timestamp
     * @return claimed Whether the inheritance has been claimed
     */
    function getInheritance(uint256 _inheritanceId)
        external
        view
        returns (
            address depositor,
            address beneficiary,
            address token,
            uint256 amount,
            uint256 deadline,
            bool claimed
        )
    {
        Inheritance storage inheritance = inheritances[_inheritanceId];
        return (
            inheritance.depositor,
            inheritance.beneficiary,
            inheritance.token,
            inheritance.amount,
            inheritance.deadline,
            inheritance.claimed
        );
    }
}
