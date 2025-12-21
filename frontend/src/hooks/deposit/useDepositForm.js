import { useState } from 'react';

/**
 * Custom hook for managing deposit form state
 * @returns {Object} Form state and handlers
 */
export const useDepositForm = () => {
  const [beneficiary, setBeneficiary] = useState('');
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState('30');
  const [tokenType, setTokenType] = useState('native'); // 'native' or 'erc20'
  const [tokenAddress, setTokenAddress] = useState('');

  const formData = {
    beneficiary,
    amount,
    days,
    tokenType,
    tokenAddress
  };

  const setters = {
    setBeneficiary,
    setAmount,
    setDays,
    setTokenType,
    setTokenAddress
  };

  const updateField = (field, value) => {
    const setter = setters[`set${field.charAt(0).toUpperCase()}${field.slice(1)}`];
    if (setter) {
      setter(value);
    }
  };

  const resetForm = () => {
    setBeneficiary('');
    setAmount('');
    setDays('30');
    setTokenAddress('');
  };

  return {
    formData,
    updateField,
    resetForm
  };
};
