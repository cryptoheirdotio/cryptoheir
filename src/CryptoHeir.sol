// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/**
 * @title CryptoHeir
 */
contract CryptoHeir {
    struct Inheritance {
        address depositor;
        address beneficiary;
        uint256 amount;
        uint256 deadline;
        bool claimed;
    }

    mapping(uint256 => Inheritance) public inheritances;

    uint256 public nextInheritanceId;

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

    error InvalidBeneficiary();
    error InvalidDeadline();
    error InsufficientAmount();
    error InheritanceNotFound();
    error AlreadyClaimed();
    error DeadlineNotReached();
    error DeadlineAlreadyPassed();
    error OnlyDepositor();
    error OnlyBeneficiary();

    function deposit(address _beneficiary, uint256 _deadline) external payable returns (uint256) {
        if (_beneficiary == address(0)) revert InvalidBeneficiary();
        if (_beneficiary == msg.sender) revert InvalidBeneficiary();
        if (_deadline <= block.timestamp) revert InvalidDeadline();
        if (msg.value == 0) revert InsufficientAmount();

        uint256 inheritanceId = nextInheritanceId++;

        inheritances[inheritanceId] = Inheritance({
            depositor: msg.sender,
            beneficiary: _beneficiary,
            amount: msg.value,
            deadline: _deadline,
            claimed: false
        });

        emit InheritanceCreated(inheritanceId, msg.sender, _beneficiary, msg.value, _deadline);

        return inheritanceId;
    }

    function claim(uint256 _inheritanceId) external {
        Inheritance storage inheritance = inheritances[_inheritanceId];

        if (inheritance.depositor == address(0)) revert InheritanceNotFound();
        if (inheritance.claimed) revert AlreadyClaimed();
        if (msg.sender != inheritance.beneficiary) revert OnlyBeneficiary();
        if (block.timestamp < inheritance.deadline) revert DeadlineNotReached();

        inheritance.claimed = true;
        uint256 amount = inheritance.amount;

        emit InheritanceClaimed(_inheritanceId, msg.sender, amount);

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }

    function reclaim(uint256 _inheritanceId) external {
        Inheritance storage inheritance = inheritances[_inheritanceId];

        if (inheritance.depositor == address(0)) revert InheritanceNotFound();
        if (inheritance.claimed) revert AlreadyClaimed();
        if (msg.sender != inheritance.depositor) revert OnlyDepositor();
        if (block.timestamp >= inheritance.deadline) revert DeadlineAlreadyPassed();

        inheritance.claimed = true;
        uint256 amount = inheritance.amount;

        emit InheritanceReclaimed(_inheritanceId, msg.sender, amount);

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }

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

    function getInheritance(uint256 _inheritanceId)
        external
        view
        returns (
            address depositor,
            address beneficiary,
            uint256 amount,
            uint256 deadline,
            bool claimed
        )
    {
        Inheritance storage inheritance = inheritances[_inheritanceId];
        return (
            inheritance.depositor,
            inheritance.beneficiary,
            inheritance.amount,
            inheritance.deadline,
            inheritance.claimed
        );
    }
}
