import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient, useReadContract } from 'wagmi';
import { parseEther, isAddress, decodeEventLog } from 'viem';
import contractABI from '../utils/CryptoHeirABI.json';

// Minimal ERC20 ABI for approve and allowance
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  }
];

export const DepositForm = ({ account }) => {
  const { contractAddress } = useOutletContext();
  const publicClient = usePublicClient();

  // Separate hooks for deposit and approval
  const {
    writeContract: writeDeposit,
    data: depositHash,
    isPending: isDepositPending,
    isError: isDepositWriteError,
    error: depositWriteError
  } = useWriteContract();

  const {
    writeContract: writeApproval,
    data: approvalHash,
    isPending: isApprovalPending,
    isError: isApprovalWriteError,
    error: approvalWriteError
  } = useWriteContract();

  const { isLoading: isDepositConfirming, isSuccess: isDepositConfirmed, data: depositReceipt } = useWaitForTransactionReceipt({ hash: depositHash });
  const { isLoading: isApprovalConfirming, isSuccess: isApprovalConfirmed } = useWaitForTransactionReceipt({ hash: approvalHash });

  const [beneficiary, setBeneficiary] = useState('');
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState('30');
  const [tokenType, setTokenType] = useState('native'); // 'native' or 'erc20'
  const [tokenAddress, setTokenAddress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [needsApproval, setNeedsApproval] = useState(false);

  const loading = isDepositPending || isDepositConfirming || isApprovalPending || isApprovalConfirming;

  // Check allowance for ERC20 tokens
  const checkAllowance = async () => {
    if (tokenType !== 'erc20' || !tokenAddress || !isAddress(tokenAddress) || !account || !contractAddress || !amount) {
      setNeedsApproval(false);
      return;
    }

    try {
      const amountWei = parseEther(amount);
      const allowance = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [account, contractAddress],
      });

      setNeedsApproval(allowance < amountWei);
    } catch (err) {
      console.error('Error checking allowance:', err);
      setNeedsApproval(true);
    }
  };

  // Check allowance when relevant fields change
  useEffect(() => {
    if (tokenType === 'erc20' && tokenAddress && amount && account && contractAddress) {
      checkAllowance();
    } else {
      setNeedsApproval(false);
    }
  }, [tokenType, tokenAddress, amount, account, contractAddress]);

  // Re-check allowance after approval is confirmed
  useEffect(() => {
    if (isApprovalConfirmed) {
      setSuccess('Approval confirmed! You can now deposit.');
      checkAllowance();
    }
  }, [isApprovalConfirmed]);

  const handleApprove = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (!tokenAddress || !isAddress(tokenAddress)) {
        throw new Error('Invalid token address');
      }

      if (!contractAddress) {
        throw new Error('Contract not initialized');
      }

      const amountWei = parseEther(amount);

      writeApproval({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [contractAddress, amountWei],
      });
    } catch (err) {
      console.error('Approval error:', err);
      setError(err.message || 'Failed to approve');
    }
  };

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

        if (needsApproval) {
          throw new Error('Please approve the contract first');
        }

        // ERC20 token deposit (approval already handled)
        writeDeposit({
          address: contractAddress,
          abi: contractABI,
          functionName: 'deposit',
          args: [token, beneficiary, amountWei, BigInt(deadline)],
        });
      } else {
        // Native token deposit
        writeDeposit({
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
    if (isDepositConfirmed && depositReceipt) {
      // Parse InheritanceCreated event from logs
      let inheritanceId = 'unknown';

      try {
        const createdEvent = contractABI.find(item => item.type === 'event' && item.name === 'InheritanceCreated');

        for (const log of depositReceipt.logs) {
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
  }, [isDepositConfirmed, depositReceipt]);

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

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title text-2xl">Create Inheritance</h2>
        <form onSubmit={handleDeposit} className="space-y-4">
          <div className="form-control">
            <label className="label" htmlFor="tokenType">
              <span className="label-text">Token Type:</span>
            </label>
            <select
              id="tokenType"
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
              <label className="label" htmlFor="tokenAddress">
                <span className="label-text">Token Contract Address:</span>
              </label>
              <input
                id="tokenAddress"
                type="text"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                placeholder="0x..."
                className="input input-bordered w-full"
                required={tokenType === 'erc20'}
                disabled={loading}
              />
            </div>
          )}
          <div className="form-control">
            <label className="label" htmlFor="beneficiary">
              <span className="label-text">Beneficiary Address:</span>
            </label>
            <input
              id="beneficiary"
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
            <label className="label" htmlFor="amount">
              <span className="label-text">Amount:</span>
            </label>
            <input
              id="amount"
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
            <label className="label" htmlFor="days">
              <span className="label-text">Lock Period (days):</span>
            </label>
            <input
              id="days"
              type="number"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="30"
              className="input input-bordered w-full"
              required
              disabled={loading}
            />
          </div>
          {tokenType === 'erc20' && needsApproval ? (
            <button
              type="button"
              onClick={handleApprove}
              className="btn btn-warning w-full"
              disabled={loading || !tokenAddress || !isAddress(tokenAddress) || !amount}
            >
              {isApprovalPending || isApprovalConfirming ? 'Approving...' : 'Approve Token'}
            </button>
          ) : (
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {isDepositPending || isDepositConfirming ? 'Processing...' : 'Deposit'}
            </button>
          )}
          {tokenType === 'erc20' && !needsApproval && tokenAddress && (
            <div className="alert alert-info">
              <span>Token approved! You can now deposit.</span>
            </div>
          )}
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
