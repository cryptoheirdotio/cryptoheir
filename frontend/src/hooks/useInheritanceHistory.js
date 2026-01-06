import { useState, useEffect } from 'react';
import { formatEther, decodeEventLog, parseAbiItem } from 'viem';
import { contractABI } from '../utils/contract';

export const useInheritanceHistory = (contractAddress, publicClient, account, networkInfo) => {
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
        // Use deployment block if available, otherwise fall back to block 0
        // This prevents querying millions of blocks on mainnet
        const fromBlock = networkInfo?.deploymentBlock ?? 0n;

        // Get current block number
        const currentBlock = await publicClient.getBlockNumber();

        // Query logs in chunks to avoid RPC provider limits
        // eth.merkle.io has a max range of 1,000 blocks
        const CHUNK_SIZE = 1000n;
        const allLogs = [];
        const allClaimedLogs = [];
        const allReclaimedLogs = [];

        // Calculate chunks
        let startBlock = fromBlock;
        while (startBlock <= currentBlock) {
          const endBlock = startBlock + CHUNK_SIZE > currentBlock ? currentBlock : startBlock + CHUNK_SIZE;

          // Query all InheritanceCreated events for this chunk
          const logs = await publicClient.getLogs({
            address: contractAddress,
            event: parseAbiItem('event InheritanceCreated(uint256 indexed inheritanceId, address indexed depositor, address indexed beneficiary, address token, uint256 amount, uint256 deadline)'),
            fromBlock: startBlock,
            toBlock: endBlock
          });
          allLogs.push(...logs);

          // Query claim events for this chunk
          const claimedLogs = await publicClient.getLogs({
            address: contractAddress,
            event: parseAbiItem('event InheritanceClaimed(uint256 indexed inheritanceId, address indexed beneficiary, address token, uint256 amount)'),
            fromBlock: startBlock,
            toBlock: endBlock
          });
          allClaimedLogs.push(...claimedLogs);

          // Query reclaim events for this chunk
          const reclaimedLogs = await publicClient.getLogs({
            address: contractAddress,
            event: parseAbiItem('event InheritanceReclaimed(uint256 indexed inheritanceId, address indexed depositor, address token, uint256 amount)'),
            fromBlock: startBlock,
            toBlock: endBlock
          });
          allReclaimedLogs.push(...reclaimedLogs);

          startBlock = endBlock + 1n;
        }

        const logs = allLogs;
        const claimedLogs = allClaimedLogs;
        const reclaimedLogs = allReclaimedLogs;

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
  }, [contractAddress, publicClient, account, networkInfo]);

  return { deposits, loading, error };
};
