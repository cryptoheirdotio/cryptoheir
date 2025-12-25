import { useMemo } from 'react';
import { useBalance, useReadContract } from 'wagmi';
import { formatUnits, isAddress } from 'viem';
import { ERC20_ABI } from '../../constants/erc20';

/**
 * Custom hook for fetching token balances (both native and ERC20)
 * @param {Object} params - Hook parameters
 * @param {string} params.tokenType - Type of token ('native' or 'erc20')
 * @param {string} params.tokenAddress - ERC20 token contract address (required for erc20)
 * @param {number} params.decimals - Token decimals (required for erc20)
 * @param {string} params.account - User's wallet address
 * @returns {Object} Balance data and state
 */
export const useTokenBalance = ({ tokenType, tokenAddress, decimals, account }) => {
  // Fetch native token balance (ETH)
  const {
    data: nativeBalance,
    isLoading: isNativeLoading,
    error: nativeError
  } = useBalance({
    address: account,
    query: {
      enabled: tokenType === 'native' && !!account
    }
  });

  // Fetch ERC20 token balance
  const {
    data: erc20Balance,
    isLoading: isErc20Loading,
    error: erc20Error,
    refetch: refetchErc20
  } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: account ? [account] : undefined,
    query: {
      enabled: tokenType === 'erc20' && !!tokenAddress && isAddress(tokenAddress) && !!account
    }
  });

  // Format balance based on token type
  const formattedBalance = useMemo(() => {
    if (tokenType === 'native' && nativeBalance) {
      return nativeBalance.formatted;
    }
    if (tokenType === 'erc20' && erc20Balance !== undefined && decimals !== undefined) {
      return formatUnits(erc20Balance, decimals);
    }
    return null;
  }, [tokenType, nativeBalance, erc20Balance, decimals]);

  // Get raw balance value
  const balance = useMemo(() => {
    if (tokenType === 'native' && nativeBalance) {
      return nativeBalance.value;
    }
    if (tokenType === 'erc20') {
      return erc20Balance;
    }
    return null;
  }, [tokenType, nativeBalance, erc20Balance]);

  // Determine loading state
  const isLoading = tokenType === 'native' ? isNativeLoading : isErc20Loading;

  // Determine error state
  const error = tokenType === 'native' ? nativeError : erc20Error;

  // Refetch function
  const refetch = tokenType === 'erc20' ? refetchErc20 : null;

  return {
    balance,
    formattedBalance,
    isLoading,
    error,
    refetch
  };
};
