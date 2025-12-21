import { isAddress } from 'viem';

export const DepositButton = ({
  tokenType,
  needsApproval,
  tokenAddress,
  amount,
  isApprovalPending,
  isApprovalConfirming,
  isDepositPending,
  isDepositConfirming,
  onApprove,
  disabled
}) => {
  const loading = isApprovalPending || isApprovalConfirming || isDepositPending || isDepositConfirming;

  if (tokenType === 'erc20' && needsApproval) {
    return (
      <button
        type="button"
        onClick={onApprove}
        className="btn btn-warning w-full text-lg font-semibold shadow-smooth-lg hover:shadow-smooth-xl transition-all"
        disabled={loading || !tokenAddress || !isAddress(tokenAddress) || !amount || disabled}
      >
        {isApprovalPending || isApprovalConfirming ? (
          <span className="flex items-center gap-2">
            <span className="loading loading-spinner loading-sm"></span>
            Approving...
          </span>
        ) : (
          'Approve Token'
        )}
      </button>
    );
  }

  return (
    <button
      type="submit"
      className="btn btn-primary w-full text-lg font-semibold shadow-smooth-lg hover:shadow-smooth-xl transition-all"
      disabled={loading || disabled}
    >
      {isDepositPending || isDepositConfirming ? (
        <span className="flex items-center gap-2">
          <span className="loading loading-spinner loading-sm"></span>
          Processing...
        </span>
      ) : (
        'Deposit'
      )}
    </button>
  );
};
