import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { usePublicClient, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from 'viem';
import contractABI from '../utils/CryptoHeirABI.json';

export const InheritanceManager = ({ account, initialId }) => {
  const { contractAddress } = useOutletContext();
  const publicClient = usePublicClient();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  const [inheritanceId, setInheritanceId] = useState(initialId || '');
  const [inheritanceData, setInheritanceData] = useState(null);
  const [loadingRead, setLoadingRead] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newDays, setNewDays] = useState('30');

  const loading = loadingRead || isPending || isConfirming;

  const loadInheritance = async (idToLoad) => {
    const id = idToLoad || inheritanceId;
    setError('');
    setSuccess('');
    setLoadingRead(true);

    try {
      if (!contractAddress || !publicClient) {
        throw new Error('Contract not initialized');
      }

      const data = await publicClient.readContract({
        address: contractAddress,
        abi: contractABI,
        functionName: 'getInheritance',
        args: [BigInt(id)],
      });

      setInheritanceData({
        depositor: data[0],
        beneficiary: data[1],
        amount: formatEther(data[2]),
        deadline: new Date(Number(data[3]) * 1000).toLocaleString(),
        deadlineTimestamp: Number(data[3]),
        claimed: data[4],
      });
    } catch (err) {
      console.error('Load error:', err);
      setError(err.message || 'Failed to load inheritance');
      setInheritanceData(null);
    } finally {
      setLoadingRead(false);
    }
  };

  const [lastAction, setLastAction] = useState('');

  const handleClaim = async () => {
    setError('');
    setSuccess('');
    setLastAction('claim');

    try {
      writeContract({
        address: contractAddress,
        abi: contractABI,
        functionName: 'claim',
        args: [BigInt(inheritanceId)],
      });
    } catch (err) {
      console.error('Claim error:', err);
      setError(err.message || 'Failed to claim');
    }
  };

  const handleReclaim = async () => {
    setError('');
    setSuccess('');
    setLastAction('reclaim');

    try {
      writeContract({
        address: contractAddress,
        abi: contractABI,
        functionName: 'reclaim',
        args: [BigInt(inheritanceId)],
      });
    } catch (err) {
      console.error('Reclaim error:', err);
      setError(err.message || 'Failed to reclaim');
    }
  };

  const handleExtend = async () => {
    setError('');
    setSuccess('');
    setLastAction('extend');

    try {
      const newDeadline = Math.floor(Date.now() / 1000) + parseInt(newDays) * 24 * 60 * 60;
      writeContract({
        address: contractAddress,
        abi: contractABI,
        functionName: 'extendDeadline',
        args: [BigInt(inheritanceId), BigInt(newDeadline)],
      });
    } catch (err) {
      console.error('Extend error:', err);
      setError(err.message || 'Failed to extend deadline');
    }
  };

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed) {
      if (lastAction === 'claim') {
        setSuccess('Successfully claimed funds!');
      } else if (lastAction === 'reclaim') {
        setSuccess('Successfully reclaimed funds!');
      } else if (lastAction === 'extend') {
        setSuccess('Successfully extended deadline!');
      }
      loadInheritance();
      setLastAction('');
    }
  }, [isConfirmed, lastAction]);

  const canClaim = inheritanceData &&
    !inheritanceData.claimed &&
    inheritanceData.beneficiary.toLowerCase() === account?.toLowerCase() &&
    Date.now() / 1000 >= inheritanceData.deadlineTimestamp;

  const canReclaim = inheritanceData &&
    !inheritanceData.claimed &&
    inheritanceData.depositor.toLowerCase() === account?.toLowerCase() &&
    Date.now() / 1000 < inheritanceData.deadlineTimestamp;

  const canExtend = inheritanceData &&
    !inheritanceData.claimed &&
    inheritanceData.depositor.toLowerCase() === account?.toLowerCase();

  // Auto-load inheritance if initialId is provided
  useEffect(() => {
    if (initialId && contractAddress && publicClient) {
      loadInheritance(initialId);
    }
  }, [initialId, contractAddress, publicClient]);

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title text-2xl">Manage Inheritance</h2>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Inheritance ID:</span>
          </label>
          <div className="join">
            <input
              type="number"
              value={inheritanceId}
              onChange={(e) => setInheritanceId(e.target.value)}
              placeholder="0"
              className="input input-bordered join-item flex-1"
              disabled={loading}
            />
            <button
              className="btn btn-primary join-item"
              onClick={loadInheritance}
              disabled={loading || !inheritanceId}
            >
              Load
            </button>
          </div>
        </div>

        {inheritanceData && (
          <div className="mt-4">
            <div className="divider">Details</div>
            <div className="stats shadow w-full mb-4">
              <div className="stat">
                <div className="stat-title">Depositor</div>
                <div className="stat-value text-sm break-all">{inheritanceData.depositor}</div>
              </div>
            </div>
            <div className="stats shadow w-full mb-4">
              <div className="stat">
                <div className="stat-title">Beneficiary</div>
                <div className="stat-value text-sm break-all">{inheritanceData.beneficiary}</div>
              </div>
            </div>
            <div className="stats stats-vertical lg:stats-horizontal shadow w-full mb-4">
              <div className="stat">
                <div className="stat-title">Amount</div>
                <div className="stat-value text-2xl">{inheritanceData.amount} ETH</div>
              </div>
              <div className="stat">
                <div className="stat-title">Status</div>
                <div className="stat-value text-2xl">
                  <span className={`badge ${inheritanceData.claimed ? 'badge-error' : 'badge-success'} badge-lg`}>
                    {inheritanceData.claimed ? 'Claimed' : 'Active'}
                  </span>
                </div>
              </div>
            </div>
            <div className="alert">
              <div>
                <div className="font-bold">Deadline</div>
                <div className="text-xs">{inheritanceData.deadline}</div>
              </div>
            </div>

            <div className="card-actions flex-col mt-4">
              {canClaim && (
                <button className="btn btn-success w-full" onClick={handleClaim} disabled={loading}>
                  Claim Funds
                </button>
              )}
              {canReclaim && (
                <button className="btn btn-warning w-full" onClick={handleReclaim} disabled={loading}>
                  Reclaim Funds
                </button>
              )}
              {canExtend && (
                <div className="w-full">
                  <div className="divider">Extend Deadline</div>
                  <div className="form-control mt-2">
                    <label className="label">
                      <span className="label-text">Extend by (days):</span>
                    </label>
                    <div className="join">
                      <input
                        type="number"
                        value={newDays}
                        onChange={(e) => setNewDays(e.target.value)}
                        placeholder="30"
                        className="input input-bordered join-item flex-1"
                        disabled={loading}
                      />
                      <button className="btn btn-primary join-item" onClick={handleExtend} disabled={loading}>
                        Extend
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
