import { useState, useEffect } from 'react';
import { formatEther, decodeEventLog, parseAbiItem } from 'viem';
import { contractABI } from '../utils/contract';

export const useInheritanceHistory = (contractAddress, publicClient, account) => {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      if (!contractAddress || !publicClient || !account) {
        setDeposits([]);
        return;
      }

      setLoading(true);
      setError('');

      try {
        // Query all InheritanceCreated events
        const logs = await publicClient.getLogs({
          address: contractAddress,
          event: parseAbiItem('event InheritanceCreated(uint256 indexed inheritanceId, address indexed depositor, address indexed beneficiary, address token, uint256 amount, uint256 deadline)'),
          fromBlock: 0n,
          toBlock: 'latest'
        });

        // Query claim and reclaim events to determine final status
        const claimedLogs = await publicClient.getLogs({
          address: contractAddress,
          event: parseAbiItem('event InheritanceClaimed(uint256 indexed inheritanceId, address indexed beneficiary, address token, uint256 amount)'),
          fromBlock: 0n,
          toBlock: 'latest'
        });

        const reclaimedLogs = await publicClient.getLogs({
          address: contractAddress,
          event: parseAbiItem('event InheritanceReclaimed(uint256 indexed inheritanceId, address indexed depositor, address token, uint256 amount)'),
          fromBlock: 0n,
          toBlock: 'latest'
        });

        // Build maps for quick lookup
        const claimedMap = new Map();
        claimedLogs.forEach(log => {
          const decoded = decodeEventLog({
            abi: contractABI,
            data: log.data,
            topics: log.topics,
          });
          claimedMap.set(decoded.args.inheritanceId.toString(), 'claimed');
        });

        const reclaimedMap = new Map();
        reclaimedLogs.forEach(log => {
          const decoded = decodeEventLog({
            abi: contractABI,
            data: log.data,
            topics: log.topics,
          });
          reclaimedMap.set(decoded.args.inheritanceId.toString(), 'reclaimed');
        });

        // Decode and filter events where user is depositor or beneficiary
        const userEvents = logs
          .map(log => {
            try {
              const decoded = decodeEventLog({
                abi: contractABI,
                data: log.data,
                topics: log.topics,
              });
              return {
                args: decoded.args,
                transactionHash: log.transactionHash,
                blockNumber: log.blockNumber
              };
            } catch {
              return null;
            }
          })
          .filter(event => {
            if (!event) return false;
            const depositor = event.args.depositor.toLowerCase();
            const beneficiary = event.args.beneficiary.toLowerCase();
            const userAddress = account.toLowerCase();
            return depositor === userAddress || beneficiary === userAddress;
          });

        // Enrich with current status
        const enrichedDeposits = await Promise.all(
          userEvents.map(async (event) => {
            const id = event.args.inheritanceId;
            const idStr = id.toString();

            try {
              const current = await publicClient.readContract({
                address: contractAddress,
                abi: contractABI,
                functionName: 'getInheritance',
                args: [id],
              });

              const deadlineTimestamp = Number(event.args.deadline);
              const now = Math.floor(Date.now() / 1000);

              // Determine role
              const isDepositor = event.args.depositor.toLowerCase() === account.toLowerCase();
              const isBeneficiary = event.args.beneficiary.toLowerCase() === account.toLowerCase();

              // Determine status by checking event logs
              let status;
              if (claimedMap.has(idStr)) {
                status = 'claimed';
              } else if (reclaimedMap.has(idStr)) {
                status = 'reclaimed';
              } else if (deadlineTimestamp <= now) {
                status = 'expired';
              } else {
                status = 'active';
              }

              return {
                id: idStr,
                depositor: event.args.depositor,
                beneficiary: event.args.beneficiary,
                amount: formatEther(event.args.amount),
                deadline: deadlineTimestamp,
                deadlineFormatted: new Date(deadlineTimestamp * 1000).toLocaleString(),
                claimed: current[5],
                status,
                role: isDepositor && isBeneficiary ? 'both' : isDepositor ? 'depositor' : 'beneficiary',
                transactionHash: event.transactionHash,
                blockNumber: Number(event.blockNumber)
              };
            } catch (err) {
              console.error(`Error fetching inheritance ${id}:`, err);
              return null;
            }
          })
        );

        // Filter out null values (failed fetches) and sort by block number (newest first)
        const validDeposits = enrichedDeposits
          .filter(d => d !== null)
          .sort((a, b) => b.blockNumber - a.blockNumber);

        setDeposits(validDeposits);
      } catch (err) {
        console.error('Error fetching inheritance history:', err);
        setError(err.message || 'Failed to fetch inheritance history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [contractAddress, publicClient, account]);

  return { deposits, loading, error };
};
