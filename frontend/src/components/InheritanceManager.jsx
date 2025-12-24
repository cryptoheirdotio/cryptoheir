import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { usePublicClient, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseAbiItem, decodeEventLog } from 'viem';
import { contractABI } from '../utils/contract';

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

      const tokenAddr = data[2];
      const isNativeToken = tokenAddr === '0x0000000000000000000000000000000000000000';

      // Check if this inheritance was claimed or reclaimed
      let claimStatus = 'active';
      if (data[5]) {
        // Check for InheritanceClaimed event
        const claimedLogs = await publicClient.getLogs({
          address: contractAddress,
          event: parseAbiItem('event InheritanceClaimed(uint256 indexed inheritanceId, address indexed beneficiary, address token, uint256 amount)'),
          fromBlock: 0n,
          toBlock: 'latest'
        });

        const wasClaimed = claimedLogs.some(log => {
          try {
            const decoded = decodeEventLog({
              abi: contractABI,
              data: log.data,
              topics: log.topics,
            });
            return decoded.args.inheritanceId.toString() === id;
          } catch {
            return false;
          }
        });

        if (wasClaimed) {
          claimStatus = 'claimed';
        } else {
          // Check for InheritanceReclaimed event
          const reclaimedLogs = await publicClient.getLogs({
            address: contractAddress,
            event: parseAbiItem('event InheritanceReclaimed(uint256 indexed inheritanceId, address indexed depositor, address token, uint256 amount)'),
            fromBlock: 0n,
            toBlock: 'latest'
          });

          const wasReclaimed = reclaimedLogs.some(log => {
            try {
              const decoded = decodeEventLog({
                abi: contractABI,
                data: log.data,
                topics: log.topics,
              });
              return decoded.args.inheritanceId.toString() === id;
            } catch {
              return false;
            }
          });

          if (wasReclaimed) {
            claimStatus = 'reclaimed';
          }
        }
      }

      setInheritanceData({
        depositor: data[0],
        beneficiary: data[1],
        token: tokenAddr,
        isNativeToken,
        tokenDisplay: isNativeToken ? 'Native Token' : tokenAddr,
        amount: formatEther(data[3]),
        deadline: new Date(Number(data[4]) * 1000).toLocaleString(),
        deadlineTimestamp: Number(data[4]),
        claimed: data[5],
        claimStatus,
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
    <div className="glass-card shadow-smooth-xl rounded-2xl">
      <div className="card-body p-8">
        <h2 className="card-title text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Manage Inheritance
        </h2>
        <p className="text-sm opacity-70 mb-6">View and manage your inheritance details</p>
        <div className="form-control">
          <label className="label" htmlFor="inheritanceId">
            <span className="label-text font-semibold text-base">Inheritance ID:</span>
          </label>
          <div className="join shadow-smooth">
            <input
              id="inheritanceId"
              type="number"
              min="0"
              step="1"
              value={inheritanceId}
              onChange={(e) => setInheritanceId(e.target.value)}
              placeholder="Enter Inheritance ID"
              className="input input-bordered join-item flex-1 focus:ring-2 focus:ring-primary focus:outline-none transition-all"
              disabled={loading}
            />
            <button
              className="btn btn-primary join-item font-semibold"
              onClick={() => loadInheritance()}
              disabled={loading || !inheritanceId}
              aria-label={!inheritanceId ? "Enter an Inheritance ID first" : "Load inheritance details"}
            >
              {loadingRead ? (
                <span className="flex items-center gap-2">
                  <span className="loading loading-spinner loading-sm"></span>
                  Loading...
                </span>
              ) : (
                'Load'
              )}
            </button>
          </div>
        </div>

        {inheritanceData && (
          <div className="mt-6 space-y-4">
            <div className="divider font-semibold text-lg">Details</div>
            <div className="stats shadow-smooth-lg w-full bg-base-100/50 dark:bg-gray-800/50 backdrop-blur">
              <div className="stat">
                <div className="stat-title font-semibold">Depositor</div>
                <div className="stat-value text-sm break-all font-mono">{inheritanceData.depositor}</div>
              </div>
            </div>
            <div className="stats shadow-smooth-lg w-full bg-base-100/50 dark:bg-gray-800/50 backdrop-blur">
              <div className="stat">
                <div className="stat-title font-semibold">Beneficiary</div>
                <div className="stat-value text-sm break-all font-mono">{inheritanceData.beneficiary}</div>
              </div>
            </div>
            <div className="stats shadow-smooth-lg w-full bg-base-100/50 dark:bg-gray-800/50 backdrop-blur">
              <div className="stat">
                <div className="stat-title font-semibold">Token</div>
                <div className="stat-value text-sm break-all">
                  {inheritanceData.isNativeToken ? (
                    <span className="badge badge-primary badge-lg font-semibold shadow-smooth">Native Token</span>
                  ) : (
                    <span className="text-xs font-mono">{inheritanceData.token}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="stats stats-vertical lg:stats-horizontal shadow-smooth-lg w-full bg-base-100/50 dark:bg-gray-800/50 backdrop-blur">
              <div className="stat">
                <div className="stat-title font-semibold">Amount</div>
                <div className="stat-value text-2xl font-bold">
                  {inheritanceData.amount} <span className="text-base opacity-70">tokens</span>
                </div>
              </div>
              <div className="stat">
                <div className="stat-title font-semibold">Status</div>
                <div className="stat-value text-2xl">
                  <span className={`badge ${
                    inheritanceData.claimStatus === 'claimed' ? 'badge-info' :
                    inheritanceData.claimStatus === 'reclaimed' ? 'badge-secondary' :
                    'badge-success'
                  } badge-lg font-semibold shadow-smooth`}>
                    {inheritanceData.claimStatus === 'claimed' ? 'Claimed' :
                     inheritanceData.claimStatus === 'reclaimed' ? 'Reclaimed' :
                     'Active'}
                  </span>
                </div>
              </div>
            </div>
            <div className="alert bg-base-200/70 dark:bg-gray-700/70 backdrop-blur shadow-smooth border border-base-300 dark:border-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <div className="font-bold text-base">Deadline</div>
                <div className="text-sm opacity-90">{inheritanceData.deadline}</div>
              </div>
            </div>

            <div className="card-actions flex-col mt-6 space-y-3">
              {canClaim && (
                <button
                  className="btn btn-success w-full text-lg font-semibold shadow-smooth-lg hover:shadow-smooth-xl transition-all"
                  onClick={handleClaim}
                  disabled={loading}
                >
                  {isPending && lastAction === 'claim' ? (
                    <span className="flex items-center gap-2">
                      <span className="loading loading-spinner loading-sm"></span>
                      Claiming...
                    </span>
                  ) : (
                    'Claim Funds'
                  )}
                </button>
              )}
              {canReclaim && (
                <button
                  className="btn btn-warning w-full text-lg font-semibold shadow-smooth-lg hover:shadow-smooth-xl transition-all"
                  onClick={handleReclaim}
                  disabled={loading}
                >
                  {isPending && lastAction === 'reclaim' ? (
                    <span className="flex items-center gap-2">
                      <span className="loading loading-spinner loading-sm"></span>
                      Reclaiming...
                    </span>
                  ) : (
                    'Reclaim Funds'
                  )}
                </button>
              )}
              {canExtend && (
                <div className="w-full">
                  <div className="divider font-semibold">Extend Deadline</div>
                  <div className="form-control mt-2">
                    <label className="label" htmlFor="newDays">
                      <span className="label-text font-semibold text-base">Extend by (days):</span>
                    </label>
                    <div className="join shadow-smooth">
                      <input
                        id="newDays"
                        type="number"
                        min="1"
                        step="1"
                        value={newDays}
                        onChange={(e) => setNewDays(e.target.value)}
                        placeholder="30"
                        className="input input-bordered join-item flex-1 focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                        disabled={loading}
                      />
                      <button
                        className="btn btn-primary join-item font-semibold"
                        onClick={handleExtend}
                        disabled={loading}
                      >
                        {isPending && lastAction === 'extend' ? (
                          <span className="flex items-center gap-2">
                            <span className="loading loading-spinner loading-sm"></span>
                            Extending...
                          </span>
                        ) : (
                          'Extend'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-error mt-6 shadow-smooth">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        )}
        {success && (
          <div className="alert alert-success mt-6 shadow-smooth">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{success}</span>
          </div>
        )}
      </div>
    </div>
  );
};
