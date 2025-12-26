import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseEther, isAddress, decodeEventLog } from 'viem';
import { contractABI } from '../../utils/contract';
import { verifyContractExists } from '../../utils/contractVerification';
import { parseContractError } from '../../utils/contractErrors';

/**
 * Custom hook for handling inheritance deposits
 * @param {Object} params - Hook parameters
 * @param {string} params.contractAddress - CryptoHeir contract address
 * @param {string} params.account - User's wallet address
 * @param {Function} params.onSuccess - Callback when deposit is successful
 * @returns {Object} Deposit state and handlers
 */
export const useInheritanceDeposit = ({ contractAddress, account, onSuccess }) => {
  const publicClient = usePublicClient();
  const [inheritanceId, setInheritanceId] = useState(null);

  const {
    writeContract: writeDeposit,
    data: depositHash,
    isPending: isDepositPending,
    isError: isDepositWriteError,
    error: depositWriteError,
    reset: resetDeposit
  } = useWriteContract();

  const {
    isLoading: isDepositConfirming,
    isSuccess: isDepositConfirmed,
    data: depositReceipt
  } = useWaitForTransactionReceipt({ hash: depositHash });

  const handleDeposit = async ({ beneficiary, amount, days, tokenType, tokenAddress, needsApproval }) => {
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

        // Verify token contract exists before deposit
        const { exists, error } = await verifyContractExists(tokenAddress, publicClient);
        if (!exists) {
          throw new Error(error || 'No contract found at token address');
        }

        if (needsApproval) {
          throw new Error('Please approve the contract first');
        }

        // Simulate ERC20 token deposit before sending transaction
        try {
          await publicClient.simulateContract({
            account: account,
            address: contractAddress,
            abi: contractABI,
            functionName: 'deposit',
            args: [token, beneficiary, amountWei, BigInt(deadline)],
          });
        } catch (simulationError) {
          console.error('Deposit simulation failed:', simulationError);
          const parsedError = parseContractError(simulationError, 'Deposit would fail');
          throw new Error(parsedError);
        }

        // If simulation passed, proceed with actual deposit
        writeDeposit({
          address: contractAddress,
          abi: contractABI,
          functionName: 'deposit',
          args: [token, beneficiary, amountWei, BigInt(deadline)],
        });
      } else {
        // Simulate native token deposit before sending transaction
        try {
          await publicClient.simulateContract({
            account: account,
            address: contractAddress,
            abi: contractABI,
            functionName: 'deposit',
            args: [token, beneficiary, amountWei, BigInt(deadline)],
            value: amountWei,
          });
        } catch (simulationError) {
          console.error('Deposit simulation failed:', simulationError);
          const parsedError = parseContractError(simulationError, 'Deposit would fail');
          throw new Error(parsedError);
        }

        // If simulation passed, proceed with actual deposit
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
      throw err;
    }
  };

  // Handle transaction confirmation and event parsing
  useEffect(() => {
    if (isDepositConfirmed && depositReceipt) {
      // Parse InheritanceCreated event from logs
      let parsedInheritanceId = 'unknown';

      try {
        for (const log of depositReceipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: contractABI,
              data: log.data,
              topics: log.topics,
            });

            if (decoded.eventName === 'InheritanceCreated') {
              parsedInheritanceId = decoded.args.inheritanceId.toString();
              break;
            }
          } catch {
            // Skip logs that don't match
            continue;
          }
        }
      } catch (err) {
        console.error('Error parsing event:', err);
      }

      setInheritanceId(parsedInheritanceId);

      if (onSuccess) {
        onSuccess(parsedInheritanceId);
      }
    }
  }, [isDepositConfirmed, depositReceipt, onSuccess]);

  return {
    handleDeposit,
    isDepositPending,
    isDepositConfirming,
    isDepositWriteError,
    depositWriteError,
    inheritanceId,
    resetDeposit
  };
};
