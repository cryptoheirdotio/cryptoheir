import { useChainId, useChains } from 'wagmi';
import { getTokensForNetwork } from '../../constants/tokenLists';

export const TokenTypeSelector = ({ tokenType, tokenAddress, onChange, disabled }) => {
  const chainId = useChainId();
  const chains = useChains();
  const availableTokens = getTokensForNetwork(chainId);

  // Get current chain's native currency symbol
  const currentChain = chains.find(chain => chain.id === chainId);
  const nativeCurrencySymbol = currentChain?.nativeCurrency?.symbol || 'ETH';

  const handleTokenSelect = (e) => {
    const selectedAddress = e.target.value;
    onChange('tokenAddress', selectedAddress);
  };

  return (
    <>
      <div className="form-control">
        <label className="label" htmlFor="tokenType">
          <span className="label-text font-semibold text-base">Token Type:</span>
        </label>
        <select
          id="tokenType"
          value={tokenType}
          onChange={(e) => onChange('tokenType', e.target.value)}
          className="select select-bordered w-full focus:ring-2 focus:ring-primary focus:outline-none transition-all"
          disabled={disabled}
        >
          <option value="native">Native Token ({nativeCurrencySymbol})</option>
          <option value="erc20">ERC20 Token</option>
        </select>
      </div>
      {tokenType === 'erc20' && (
        <div className="form-control">
          <label className="label" htmlFor="tokenSelect">
            <span className="label-text font-semibold text-base">Select Token:</span>
          </label>
          <div className="relative">
            <select
              id="tokenSelect"
              value={tokenAddress}
              onChange={handleTokenSelect}
              className="select select-bordered w-full focus:ring-2 focus:ring-primary focus:outline-none transition-all pl-12"
              required={tokenType === 'erc20'}
              disabled={disabled || availableTokens.length === 0}
            >
              <option value="">Choose a token...</option>
              {availableTokens.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
            {tokenAddress && (
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <img
                  src={availableTokens.find(t => t.address === tokenAddress)?.logo}
                  alt={availableTokens.find(t => t.address === tokenAddress)?.symbol}
                  className="w-6 h-6"
                />
              </div>
            )}
          </div>
          {availableTokens.length === 0 && (
            <label className="label">
              <span className="label-text-alt text-warning">No tokens available for this network</span>
            </label>
          )}
        </div>
      )}
    </>
  );
};
