import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useDepositForm } from '../hooks/deposit/useDepositForm';
import { useERC20Approval } from '../hooks/deposit/useERC20Approval';
import { useInheritanceDeposit } from '../hooks/deposit/useInheritanceDeposit';
import { TokenTypeSelector } from './DepositForm/TokenTypeSelector';
import { DepositFormFields } from './DepositForm/DepositFormFields';
import { DepositButton } from './DepositForm/DepositButton';
import { AlertMessages } from './DepositForm/AlertMessages';

export const DepositForm = ({ account }) => {
  const { contractAddress } = useOutletContext();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state management
  const { formData, updateField, resetForm } = useDepositForm();
  const { beneficiary, amount, days, tokenType, tokenAddress } = formData;

  // ERC20 approval handling
  const {
    needsApproval,
    handleApprove,
    isApprovalPending,
    isApprovalConfirming,
    isApprovalConfirmed,
    isApprovalWriteError,
    approvalWriteError
  } = useERC20Approval({
    tokenType,
    tokenAddress,
    amount,
    account,
    contractAddress
  });

  // Deposit handling
  const {
    handleDeposit: executeDeposit,
    isDepositPending,
    isDepositConfirming,
    isDepositWriteError,
    depositWriteError
  } = useInheritanceDeposit({
    contractAddress,
    onSuccess: (id) => {
      setSuccess(`Successfully deposited! Inheritance ID: ${id}`);
      resetForm();
    }
  });

  const loading = isDepositPending || isDepositConfirming || isApprovalPending || isApprovalConfirming;

  // Handle approval success
  useEffect(() => {
    if (isApprovalConfirmed) {
      setSuccess('Approval confirmed! You can now deposit.');
    }
  }, [isApprovalConfirmed]);

  // Handle deposit write errors
  useEffect(() => {
    if (isDepositWriteError && depositWriteError) {
      setError(depositWriteError.message || 'Failed to deposit');
    }
  }, [isDepositWriteError, depositWriteError]);

  // Handle approval write errors
  useEffect(() => {
    if (isApprovalWriteError && approvalWriteError) {
      setError(approvalWriteError.message || 'Failed to approve');
    }
  }, [isApprovalWriteError, approvalWriteError]);

  const onApprove = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await handleApprove();
    } catch (err) {
      setError(err.message || 'Failed to approve');
    }
  };

  const onDeposit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await executeDeposit({
        beneficiary,
        amount,
        days,
        tokenType,
        tokenAddress,
        needsApproval
      });
    } catch (err) {
      setError(err.message || 'Failed to deposit');
    }
  };

  return (
    <div className="glass-card shadow-smooth-xl rounded-2xl">
      <div className="card-body p-8">
        <h2 className="card-title text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Create Inheritance
        </h2>
        <p className="text-sm opacity-70 mb-6">Set up a time-locked transfer for your beneficiary</p>
        <form onSubmit={onDeposit} className="space-y-6">
          <TokenTypeSelector
            tokenType={tokenType}
            tokenAddress={tokenAddress}
            onChange={updateField}
            disabled={loading}
          />
          <DepositFormFields
            beneficiary={beneficiary}
            amount={amount}
            days={days}
            onChange={updateField}
            disabled={loading}
          />
          <DepositButton
            tokenType={tokenType}
            needsApproval={needsApproval}
            tokenAddress={tokenAddress}
            amount={amount}
            isApprovalPending={isApprovalPending}
            isApprovalConfirming={isApprovalConfirming}
            isDepositPending={isDepositPending}
            isDepositConfirming={isDepositConfirming}
            onApprove={onApprove}
            disabled={loading}
          />
          <AlertMessages
            error={error}
            success={success}
            tokenType={tokenType}
            needsApproval={needsApproval}
            tokenAddress={tokenAddress}
          />
        </form>
      </div>
    </div>
  );
};
