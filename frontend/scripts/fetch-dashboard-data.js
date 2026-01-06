#!/usr/bin/env node

/**
 * Dashboard Data Fetcher
 *
 * This script fetches ecosystem-wide statistics from all configured networks
 * and saves the aggregated data to a JSON file for the dashboard to display.
 *
 * Run with: npm run fetch-dashboard
 */

import { createPublicClient, http, parseAbiItem, formatEther } from 'viem';
import { mainnet, sepolia, foundry } from 'viem/chains';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import contract configuration
import { NETWORKS } from '../src/utils/networkConfig.js';
import { TOKEN_LISTS, getTokenByAddress } from '../src/constants/tokenLists.js';
import contractArtifact from '../../foundry/out/CryptoHeir.sol/CryptoHeir.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const contractABI = contractArtifact.abi;

// Map chain IDs to viem chain configs
const CHAIN_CONFIGS = {
  1: mainnet,
  11155111: sepolia,
  31337: foundry,
};

/**
 * Fetch all events from a contract in chunks
 */
async function fetchAllEvents(publicClient, contractAddress, eventAbi, fromBlock, toBlock) {
  const CHUNK_SIZE = 1000n;
  const allLogs = [];

  let startBlock = fromBlock;
  while (startBlock <= toBlock) {
    const endBlock = startBlock + CHUNK_SIZE > toBlock ? toBlock : startBlock + CHUNK_SIZE;

    try {
      const logs = await publicClient.getLogs({
        address: contractAddress,
        event: parseAbiItem(eventAbi),
        fromBlock: startBlock,
        toBlock: endBlock
      });
      allLogs.push(...logs);

      process.stdout.write(`\r  Scanning blocks ${startBlock} - ${endBlock}...`);
    } catch (error) {
      console.error(`\n  Error fetching logs for blocks ${startBlock}-${endBlock}:`, error.message);
    }

    startBlock = endBlock + 1n;
  }

  console.log(''); // New line after progress
  return allLogs;
}

/**
 * Fetch data for a single network
 */
async function fetchNetworkData(networkConfig) {
  const { name, chainId, contractAddress, deploymentBlock } = networkConfig;

  if (!contractAddress) {
    console.log(`⊘ Skipping ${name} (no contract address configured)`);
    return null;
  }

  console.log(`\n📊 Fetching data for ${name}...`);

  try {
    const chain = CHAIN_CONFIGS[chainId];
    if (!chain) {
      console.log(`  ⚠️  Chain config not found for chainId ${chainId}`);
      return null;
    }

    const publicClient = createPublicClient({
      chain,
      transport: http()
    });

    // Get current block
    const currentBlock = await publicClient.getBlockNumber();
    console.log(`  Current block: ${currentBlock}`);
    console.log(`  Deployment block: ${deploymentBlock}`);

    // Fetch all InheritanceCreated events
    console.log('  Fetching InheritanceCreated events...');
    const createdLogs = await fetchAllEvents(
      publicClient,
      contractAddress,
      'event InheritanceCreated(uint256 indexed inheritanceId, address indexed depositor, address indexed beneficiary, address token, uint256 amount, uint256 deadline)',
      deploymentBlock,
      currentBlock
    );

    // Fetch all InheritanceClaimed events
    console.log('  Fetching InheritanceClaimed events...');
    const claimedLogs = await fetchAllEvents(
      publicClient,
      contractAddress,
      'event InheritanceClaimed(uint256 indexed inheritanceId, address indexed beneficiary, address token, uint256 amount)',
      deploymentBlock,
      currentBlock
    );

    // Fetch all InheritanceReclaimed events
    console.log('  Fetching InheritanceReclaimed events...');
    const reclaimedLogs = await fetchAllEvents(
      publicClient,
      contractAddress,
      'event InheritanceReclaimed(uint256 indexed inheritanceId, address indexed depositor, address token, uint256 amount)',
      deploymentBlock,
      currentBlock
    );

    console.log(`  ✓ Found ${createdLogs.length} created, ${claimedLogs.length} claimed, ${reclaimedLogs.length} reclaimed`);

    // Build status maps
    const claimedIds = new Set(claimedLogs.map(log => log.topics[1])); // inheritanceId is first indexed param
    const reclaimedIds = new Set(reclaimedLogs.map(log => log.topics[1]));

    // Aggregate token statistics
    const tokenStats = {};
    const now = Math.floor(Date.now() / 1000);

    createdLogs.forEach(log => {
      const inheritanceId = log.topics[1];
      const tokenAddress = '0x' + log.data.slice(26, 66); // Extract token address from data
      const amount = BigInt('0x' + log.data.slice(66, 130)); // Extract amount
      const deadline = BigInt('0x' + log.data.slice(130, 194)); // Extract deadline

      // Determine token symbol
      let tokenSymbol = 'ETH';
      let tokenDecimals = 18;
      if (tokenAddress !== '0x0000000000000000000000000000000000000000') {
        const tokenInfo = getTokenByAddress(chainId, tokenAddress);
        if (tokenInfo) {
          tokenSymbol = tokenInfo.symbol;
          tokenDecimals = tokenInfo.decimals;
        } else {
          tokenSymbol = tokenAddress.slice(0, 8) + '...'; // Use shortened address if unknown
        }
      }

      // Determine status
      let status = 'active';
      if (claimedIds.has(inheritanceId)) {
        status = 'claimed';
      } else if (reclaimedIds.has(inheritanceId)) {
        status = 'reclaimed';
      } else if (Number(deadline) <= now) {
        status = 'expired';
      }

      // Initialize token stats if needed
      if (!tokenStats[tokenSymbol]) {
        tokenStats[tokenSymbol] = {
          symbol: tokenSymbol,
          address: tokenAddress,
          decimals: tokenDecimals,
          count: 0,
          totalAmount: 0n,
          active: 0,
          claimed: 0,
          reclaimed: 0,
          expired: 0
        };
      }

      // Update stats
      tokenStats[tokenSymbol].count++;
      tokenStats[tokenSymbol].totalAmount += amount;
      tokenStats[tokenSymbol][status]++;
    });

    // Calculate total stats for this network
    const totalInheritances = createdLogs.length;
    const totalClaimed = claimedLogs.length;
    const totalReclaimed = reclaimedLogs.length;
    const totalActive = totalInheritances - totalClaimed - totalReclaimed;

    return {
      name,
      chainId,
      contractAddress,
      totalInheritances,
      totalActive,
      totalClaimed,
      totalReclaimed,
      tokenStats: Object.values(tokenStats).map(stats => ({
        symbol: stats.symbol,
        address: stats.address,
        count: stats.count,
        totalAmount: formatEther(stats.totalAmount),
        active: stats.active,
        claimed: stats.claimed,
        reclaimed: stats.reclaimed,
        expired: stats.expired
      }))
    };
  } catch (error) {
    console.error(`  ✗ Error fetching data for ${name}:`, error.message);
    return null;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 CryptoHeir Dashboard Data Fetcher');
  console.log('=====================================\n');

  const startTime = Date.now();

  // Fetch data from all networks in parallel
  const networkDataPromises = Object.values(NETWORKS).map(fetchNetworkData);
  const networkDataResults = await Promise.all(networkDataPromises);

  // Filter out null results (networks that were skipped or failed)
  const networkData = networkDataResults.filter(data => data !== null);

  if (networkData.length === 0) {
    console.log('\n⚠️  No data fetched from any network!');
    process.exit(1);
  }

  // Aggregate global statistics
  let globalTotalInheritances = 0;
  let globalTotalActive = 0;
  let globalTotalClaimed = 0;
  let globalTotalReclaimed = 0;
  const globalTokenStats = {};

  networkData.forEach(network => {
    globalTotalInheritances += network.totalInheritances;
    globalTotalActive += network.totalActive;
    globalTotalClaimed += network.totalClaimed;
    globalTotalReclaimed += network.totalReclaimed;

    // Aggregate token stats across networks
    network.tokenStats.forEach(tokenStat => {
      const key = `${tokenStat.symbol}-${network.chainId}`;
      if (!globalTokenStats[key]) {
        globalTokenStats[key] = {
          ...tokenStat,
          network: network.name,
          chainId: network.chainId
        };
      }
    });
  });

  // Build final dashboard data
  const dashboardData = {
    lastUpdated: new Date().toISOString(),
    updateDuration: Date.now() - startTime,
    global: {
      totalInheritances: globalTotalInheritances,
      totalActive: globalTotalActive,
      totalClaimed: globalTotalClaimed,
      totalReclaimed: globalTotalReclaimed
    },
    networks: networkData.reduce((acc, network) => {
      acc[network.chainId] = {
        name: network.name,
        contractAddress: network.contractAddress,
        totalInheritances: network.totalInheritances,
        totalActive: network.totalActive,
        totalClaimed: network.totalClaimed,
        totalReclaimed: network.totalReclaimed,
        tokenStats: network.tokenStats
      };
      return acc;
    }, {}),
    tokens: Object.values(globalTokenStats)
  };

  // Write to JSON file
  const outputPath = join(__dirname, '../public/dashboard-data.json');
  writeFileSync(outputPath, JSON.stringify(dashboardData, null, 2));

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n✅ Dashboard data successfully generated!');
  console.log(`📁 Output: ${outputPath}`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log('\n📊 Summary:');
  console.log(`  Total Inheritances: ${globalTotalInheritances}`);
  console.log(`  Active: ${globalTotalActive}`);
  console.log(`  Claimed: ${globalTotalClaimed}`);
  console.log(`  Reclaimed: ${globalTotalReclaimed}`);
  console.log(`  Networks: ${networkData.length}`);
  console.log(`  Unique Tokens: ${Object.keys(globalTokenStats).length}`);
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
