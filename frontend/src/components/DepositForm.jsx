import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseEther, isAddress, decodeEventLog } from 'viem';
import contractABI from '../utils/CryptoHeirABI.json';

export const DepositForm = ({ account }) => {
  const { contractAddress } = useOutletContext();
  const publicClient = usePublicClient();
  const { writeContract, data: hash, isPending, isError: isWriteError, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } = useWaitForTransactionReceipt({ hash });
  const [beneficiary, setBeneficiary] = useState('');
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState('30');
  const [tokenType, setTokenType] = useState('native'); // 'native' or 'erc20'
  const [tokenAddress, setTokenAddress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loading = isPending || isConfirming;

  const handleDeposit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (!contractAddress) {
        throw new Error('Contract not initialized');
      }

      if (!isAddress(beneficiary)) {
        throw new Error('Invalid beneficiary address');
      }

      const deadline = Math.floor(Date.now() / 1000) + parseInt(days) * 24 * 60 * 60;
      const amountWei = parseEther(amount);

      // Determine token address (address(0) for native token)
      const token = tokenType === 'native' ? '0x0000000000000000000000000000000000000000' : tokenAddress;

      if (tokenType === 'erc20') {
        if (!isAddress(tokenAddress)) {
          throw new Error('Invalid token address');
        }

        // For ERC20 tokens, user needs to approve the contract first
        // This will be handled in a separate transaction
        // For now, we'll just try to deposit and let the user handle approval separately
        writeContract({
          address: contractAddress,
          abi: contractABI,
          functionName: 'deposit',
          args: [token, beneficiary, amountWei, BigInt(deadline)],
        });
      } else {
        // Native token deposit
        writeContract({
          address: contractAddress,
          abi: contractABI,
          functionName: 'deposit',
          args: [token, beneficiary, amountWei, BigInt(deadline)],
          value: amountWei,
        });
      }
    } catch (err) {
      console.error('Deposit error:', err);
      setError(err.message || 'Failed to deposit');
    }
  };

  // Handle transaction confirmation and event parsing
  useEffect(() => {
    if (isConfirmed && receipt) {
      // Parse InheritanceCreated event from logs
      let inheritanceId = 'unknown';

      try {
        const createdEvent = contractABI.find(item => item.type === 'event' && item.name === 'InheritanceCreated');

        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: contractABI,
              data: log.data,
              topics: log.topics,
            });

            if (decoded.eventName === 'InheritanceCreated') {
              inheritanceId = decoded.args.inheritanceId.toString();
              break;
            }
          } catch (e) {
            // Skip logs that don't match
            continue;
          }
        }
      } catch (err) {
        console.error('Error parsing event:', err);
      }

      setSuccess(`Successfully deposited! Inheritance ID: ${inheritanceId}`);
      setBeneficiary('');
      setAmount('');
      setDays('30');
      setTokenAddress('');
    }
  }, [isConfirmed, receipt]);

  // Handle write errors
  useEffect(() => {
    if (isWriteError && writeError) {
      setError(writeError.message || 'Failed to deposit');
    }
  }, [isWriteError, writeError]);

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title text-2xl">Create Inheritance</h2>
        <form onSubmit={handleDeposit} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Token Type:</span>
            </label>
            <select
              value={tokenType}
              onChange={(e) => setTokenType(e.target.value)}
              className="select select-bordered w-full"
              disabled={loading}
            >
              <option value="native">Native Token (ETH/MATIC/etc)</option>
              <option value="erc20">ERC20 Token</option>
            </select>
          </div>
          {tokenType === 'erc20' && (
            <div className="form-control">
              <label className="label">
                <span className="label-text">Token Contract Address:</span>
              </label>
              <input
                type="text"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                placeholder="0x..."
                className="input input-bordered w-full"
                required={tokenType === 'erc20'}
                disabled={loading}
              />
              <label className="label">
                <span className="label-text-alt text-warning">
                  Note: You must approve the CryptoHeir contract to spend your tokens first
                </span>
              </label>
            </div>
          )}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Beneficiary Address:</span>
            </label>
            <input
              type="text"
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
              placeholder="0x..."
              className="input input-bordered w-full"
              required
              disabled={loading}
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Amount:</span>
            </label>
            <input
              type="number"
              step="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.1"
              className="input input-bordered w-full"
              required
              disabled={loading}
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Lock Period (days):</span>
            </label>
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="30"
              className="input input-bordered w-full"
              required
              disabled={loading}
            />
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Processing...' : 'Deposit'}
          </button>
        </form>
        {error && (
          <div className="alert alert-error mt-4">
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert alert-success mt-4">
            <span>{success}</span>
          </div>
        )}
      </div>
    </div>
  );
};
