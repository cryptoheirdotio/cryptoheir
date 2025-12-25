import { useMemo } from 'react';
import { useChainId, useChains } from 'wagmi';
import { useTokenBalance } from '../../hooks/deposit/useTokenBalance';
import { getTokenByAddress } from '../../constants/tokenLists';

export const DepositFormFields = ({ beneficiary, amount, days, onChange, disabled, tokenType, tokenAddress, account }) => {
  const chainId = useChainId();
  const chains = useChains();

  // Get token data for ERC20 tokens
  const selectedToken = useMemo(() => {
    if (tokenType === 'erc20' && tokenAddress) {
      return getTokenByAddress(chainId, tokenAddress);
    }
    return null;
  }, [tokenType, tokenAddress, chainId]);

  // Get native currency symbol
  const currentChain = chains.find(chain => chain.id === chainId);
  const nativeCurrencySymbol = currentChain?.nativeCurrency?.symbol || 'ETH';

  // Fetch balance
  const { formattedBalance } = useTokenBalance({
    tokenType,
    tokenAddress,
    decimals: selectedToken?.decimals,
    account
  });

  // Get display symbol
  const tokenSymbol = tokenType === 'erc20' ? selectedToken?.symbol : nativeCurrencySymbol;

  // Handle Max button click
  const handleMaxClick = () => {
    if (formattedBalance) {
      onChange('amount', formattedBalance);
    }
  };

  return (
    <>
      <div className="form-control">
        <label className="label" htmlFor="beneficiary">
          <span className="label-text font-semibold text-base">Beneficiary Address:</span>
        </label>
        <input
          id="beneficiary"
          type="text"
          value={beneficiary}
          onChange={(e) => onChange('beneficiary', e.target.value)}
          placeholder="0x..."
          className="input input-bordered w-full focus:ring-2 focus:ring-primary focus:outline-none transition-all"
          required
          disabled={disabled}
        />
      </div>
      <div className="form-control">
        <label className="label" htmlFor="amount">
          <span className="label-text font-semibold text-base">
            Amount:
            {formattedBalance && account && (
              <span className="font-normal text-sm opacity-70 ml-1">
                (Balance: {parseFloat(formattedBalance).toLocaleString(undefined, {
                  maximumFractionDigits: 6
                })} {tokenSymbol})
              </span>
            )}
          </span>
        </label>
        <div className="relative">
          <input
            id="amount"
            type="number"
            step="0.001"
            value={amount}
            onChange={(e) => onChange('amount', e.target.value)}
            placeholder="0.1"
            className="input input-bordered w-full focus:ring-2 focus:ring-primary focus:outline-none transition-all pr-16"
            required
            disabled={disabled}
          />
          {formattedBalance && account && (
            <button
              type="button"
              onClick={handleMaxClick}
              disabled={disabled}
              className="btn btn-sm btn-ghost absolute right-2 top-1/2 transform -translate-y-1/2 h-8 min-h-8"
            >
              Max
            </button>
          )}
        </div>
      </div>
      <div className="form-control">
        <label className="label" htmlFor="days">
          <span className="label-text font-semibold text-base">Lock Period (days):</span>
        </label>
        <input
          id="days"
          type="number"
          min="1"
          value={days}
          onChange={(e) => onChange('days', e.target.value)}
          placeholder="30"
          className="input input-bordered w-full focus:ring-2 focus:ring-primary focus:outline-none transition-all"
          required
          disabled={disabled}
        />
      </div>
    </>
  );
};
