import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useDepositForm } from '../hooks/deposit/useDepositForm';
import { useERC20Approval } from '../hooks/deposit/useERC20Approval';
import { useInheritanceDeposit } from '../hooks/deposit/useInheritanceDeposit';
import { TokenTypeSelector } from './DepositForm/TokenTypeSelector';
import { DepositFormFields } from './DepositForm/DepositFormFields';
import { DepositButton } from './DepositForm/DepositButton';
import { AlertMessages } from './DepositForm/AlertMessages';
import { parseContractError } from '../utils/contractErrors';

export const DepositForm = ({ account }) => {
  const { contractAddress } = useOutletContext();
  const [manualError, setManualError] = useState('');
  const [manualSuccess, setManualSuccess] = useState('');

  // Form state management
  const { formData, updateField, resetForm } = useDepositForm();
  const { beneficiary, amount, days, tokenType, tokenAddress } = formData;

  // Wrapper for updateField that also clears errors
  const handleFieldChange = (field, value) => {
    updateField(field, value);
    setManualError('');
    setManualSuccess('');
    resetDeposit();
    resetApproval();
  };

  // ERC20 approval handling
  const {
    needsApproval,
    handleApprove,
    isApprovalPending,
    isApprovalConfirming,
    isApprovalConfirmed,
    isApprovalWriteError,
    approvalWriteError,
    resetApproval
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
    depositWriteError,
    resetDeposit
  } = useInheritanceDeposit({
    contractAddress,
    account,
    onSuccess: (id) => {
      setManualSuccess(`Successfully deposited! Inheritance ID: ${id}`);
      resetForm();
    }
  });

  const loading = isDepositPending || isDepositConfirming || isApprovalPending || isApprovalConfirming;

  // Derive error and success messages instead of using effects
  const error = useMemo(() => {
    if (manualError) return manualError;
    if (isDepositWriteError && depositWriteError) {
      return parseContractError(depositWriteError, 'Failed to deposit');
    }
    if (isApprovalWriteError && approvalWriteError) {
      return parseContractError(approvalWriteError, 'Failed to approve');
    }
    return '';
  }, [manualError, isDepositWriteError, depositWriteError, isApprovalWriteError, approvalWriteError]);

  const success = useMemo(() => {
    if (manualSuccess) return manualSuccess;
    if (isApprovalConfirmed) return 'Approval confirmed! You can now deposit.';
    return '';
  }, [manualSuccess, isApprovalConfirmed]);

  const onApprove = async (e) => {
    e.preventDefault();
    setManualError('');
    setManualSuccess('');

    try {
      await handleApprove();
    } catch (err) {
      setManualError(err.message || 'Failed to approve');
    }
  };

  const onDeposit = async (e) => {
    e.preventDefault();
    setManualError('');
    setManualSuccess('');

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
      setManualError(err.message || 'Failed to deposit');
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
            onChange={handleFieldChange}
            disabled={loading}
            setManualError={setManualError}
          />
          <DepositFormFields
            beneficiary={beneficiary}
            amount={amount}
            days={days}
            onChange={handleFieldChange}
            disabled={loading}
            tokenType={tokenType}
            tokenAddress={tokenAddress}
            account={account}
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
