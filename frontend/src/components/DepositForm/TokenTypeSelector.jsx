export const TokenTypeSelector = ({ tokenType, tokenAddress, onChange, disabled }) => {
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
          <option value="native">Native Token (ETH/MATIC/etc)</option>
          <option value="erc20">ERC20 Token</option>
        </select>
      </div>
      {tokenType === 'erc20' && (
        <div className="form-control">
          <label className="label" htmlFor="tokenAddress">
            <span className="label-text font-semibold text-base">Token Contract Address:</span>
          </label>
          <input
            id="tokenAddress"
            type="text"
            value={tokenAddress}
            onChange={(e) => onChange('tokenAddress', e.target.value)}
            placeholder="0x..."
            className="input input-bordered w-full focus:ring-2 focus:ring-primary focus:outline-none transition-all"
            required={tokenType === 'erc20'}
            disabled={disabled}
          />
        </div>
      )}
    </>
  );
};
