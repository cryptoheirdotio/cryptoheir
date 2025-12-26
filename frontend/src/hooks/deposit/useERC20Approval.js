import { useState, useEffect, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseEther, isAddress } from 'viem';
import { ERC20_ABI } from '../../constants/erc20';
import { verifyContractExists } from '../../utils/contractVerification';
import { parseContractError } from '../../utils/contractErrors';

/**
 * Custom hook for handling ERC20 token approvals
 * @param {Object} params - Hook parameters
 * @param {string} params.tokenType - Type of token ('native' or 'erc20')
 * @param {string} params.tokenAddress - ERC20 token contract address
 * @param {string} params.amount - Amount to approve (in ether units)
 * @param {string} params.account - User's wallet address
 * @param {string} params.contractAddress - CryptoHeir contract address to approve
 * @returns {Object} Approval state and handlers
 */
export const useERC20Approval = ({ tokenType, tokenAddress, amount, account, contractAddress }) => {
  const publicClient = usePublicClient();
  const [needsApproval, setNeedsApproval] = useState(false);

  const {
    writeContract: writeApproval,
    data: approvalHash,
    isPending: isApprovalPending,
    isError: isApprovalWriteError,
    error: approvalWriteError
  } = useWriteContract();

  const {
    isLoading: isApprovalConfirming,
    isSuccess: isApprovalConfirmed
  } = useWaitForTransactionReceipt({ hash: approvalHash });

  // Check allowance for ERC20 tokens
  const checkAllowance = useCallback(async () => {
    if (tokenType !== 'erc20' || !tokenAddress || !isAddress(tokenAddress) || !account || !contractAddress || !amount) {
      setNeedsApproval(false);
      return;
    }

    try {
      // Verify token contract exists before checking allowance
      const { exists, error } = await verifyContractExists(tokenAddress, publicClient);
      if (!exists) {
        console.error('Token contract verification failed:', error);
        throw new Error(error || 'No contract found at token address');
      }

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
  }, [tokenType, tokenAddress, amount, account, contractAddress, publicClient]);

  // Check allowance when relevant fields change
  useEffect(() => {
    if (tokenType === 'erc20' && tokenAddress && amount && account && contractAddress) {
      checkAllowance();
    } else {
      setNeedsApproval(false);
    }
  }, [tokenType, tokenAddress, amount, account, contractAddress, checkAllowance]);

  // Re-check allowance after approval is confirmed
  useEffect(() => {
    if (isApprovalConfirmed) {
      checkAllowance();
    }
  }, [isApprovalConfirmed, checkAllowance]);

  const handleApprove = async () => {
    try {
      if (!tokenAddress || !isAddress(tokenAddress)) {
        throw new Error('Invalid token address');
      }

      if (!contractAddress) {
        throw new Error('Contract not initialized');
      }

      // Verify token contract exists before attempting approval
      const { exists, error } = await verifyContractExists(tokenAddress, publicClient);
      if (!exists) {
        throw new Error(error || 'No contract found at token address');
      }

      const amountWei = parseEther(amount);

      // Simulate approval before sending transaction
      try {
        await publicClient.simulateContract({
          account: account,
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [contractAddress, amountWei],
        });
      } catch (simulationError) {
        console.error('Approval simulation failed:', simulationError);
        const parsedError = parseContractError(simulationError, 'Approval would fail');
        throw new Error(parsedError);
      }

      // If simulation passed, proceed with actual approval
      writeApproval({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [contractAddress, amountWei],
      });
    } catch (err) {
      console.error('Approval error:', err);
      throw err;
    }
  };

  return {
    needsApproval,
    handleApprove,
    isApprovalPending,
    isApprovalConfirming,
    isApprovalConfirmed,
    isApprovalWriteError,
    approvalWriteError
  };
};
