import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Broadcast a signed transaction from a file
 *
 * Reads network information from the signed transaction file and uses it to build RPC URL.
 * Supports both Infura (with INFURA_API_KEY) and custom RPC providers (with RPC_URL).
 *
 * Usage: node broadcast-transaction.js <signed-tx-file>
 */

function getRpcUrl(networkName) {
  // If RPC_URL is set in .env, use it directly (custom provider)
  const rpcUrl = process.env.RPC_URL;
  if (rpcUrl) {
    return rpcUrl;
  }

  // If network name is available from the transaction file, build Infura URL
  if (networkName) {
    const infuraApiKey = process.env.INFURA_API_KEY;
    if (!infuraApiKey) {
      console.error('Error: INFURA_API_KEY not set in .env file');
      console.error('Either set INFURA_API_KEY or set RPC_URL for a custom provider');
      process.exit(1);
    }
    return `https://${networkName}.infura.io/v3/${infuraApiKey}`;
  }

  // Neither RPC_URL nor network name available
  console.error('Error: No RPC configuration found');
  console.error('The signed transaction file does not contain network information,');
  console.error('and RPC_URL is not set in .env file.');
  console.error('\nPlease set RPC_URL in .env for a custom provider');
  process.exit(1);
}

async function broadcastTransaction() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: node broadcast-transaction.js <signed-tx-file>');
    console.error('\nExample:');
    console.error('  node broadcast-transaction.js signed-tx.json');
    process.exit(1);
  }

  const txFile = args[0];

  console.log('CryptoHeir Transaction Broadcaster');
  console.log('==================================\n');

  try {
    // Load the signed transaction
    if (!fs.existsSync(txFile)) {
      console.error(`Error: Transaction file not found: ${txFile}`);
      process.exit(1);
    }

    const txData = JSON.parse(fs.readFileSync(txFile, 'utf8'));

    if (!txData.signedTransaction) {
      console.error('Error: Invalid transaction file format (missing signedTransaction)');
      process.exit(1);
    }

    console.log('✓ Loaded signed transaction');
    console.log(`  File: ${txFile}`);
    console.log(`  Transaction hash: ${txData.txHash}`);
    console.log(`  From: ${txData.deployer || txData.from}`);

    if (txData.mode) {
      console.log(`  Type: ${txData.mode === 'deploy' ? 'Contract Deployment' : `Function Call (${txData.functionName})`}`);
    }

    if (txData.predictedContractAddress) {
      console.log(`  Predicted contract address: ${txData.predictedContractAddress}`);
    }

    if (txData.to) {
      console.log(`  Contract: ${txData.to}`);
    }

    if (txData.value && txData.value !== '0') {
      console.log(`  Value: ${txData.value} ETH`);
    }

    // Get RPC URL from network name in metadata or from .env
    const networkName = txData.metadata?.network?.name;
    const rpcUrl = getRpcUrl(networkName);

    // Connect to the network
    console.log('\n✓ Connecting to network...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const network = await provider.getNetwork();
    console.log(`  Network: ${network.name} (Chain ID: ${network.chainId})`);

    // Verify chain ID matches
    if (txData.chainId && Number(txData.chainId) !== Number(network.chainId)) {
      console.error(`\n❌ Error: Chain ID mismatch!`);
      console.error(`  Transaction signed for chain ID: ${txData.chainId}`);
      console.error(`  Connected to chain ID: ${network.chainId}`);
      console.error('\n  Please connect to the correct network.');
      process.exit(1);
    }

    // Check if the transaction has already been broadcast
    console.log('\n✓ Checking transaction status...');
    try {
      const existingTx = await provider.getTransaction(txData.txHash);
      if (existingTx) {
        console.log('⚠️  This transaction has already been broadcast!');
        console.log(`  Block number: ${existingTx.blockNumber || 'pending'}`);

        if (existingTx.blockNumber) {
          const receipt = await provider.getTransactionReceipt(txData.txHash);
          console.log(`  Status: ${receipt.status === 1 ? 'Success ✓' : 'Failed ✗'}`);

          if (txData.predictedContractAddress) {
            console.log(`  Contract deployed at: ${receipt.contractAddress}`);
          }
        } else {
          console.log('  Status: Pending...');
        }

        process.exit(0);
      }
    } catch (e) {
      // Transaction not found, which is expected for a new transaction
    }

    // Broadcast the transaction
    console.log('\n📤 Broadcasting transaction...');
    const txResponse = await provider.broadcastTransaction(txData.signedTransaction);

    console.log('✓ Transaction broadcast successful!');
    console.log('  ┌─────────────────────────────────────────────────');
    console.log(`  │ Transaction hash: ${txResponse.hash}`);
    console.log('  └─────────────────────────────────────────────────');

    // Wait for confirmation
    console.log('\n⏳ Waiting for confirmation...');
    console.log('   (This may take a few seconds to a few minutes)\n');

    const receipt = await txResponse.wait();

    console.log('✓ Transaction confirmed!');
    console.log('  ┌─────────────────────────────────────────────────');
    console.log(`  │ Block number: ${receipt.blockNumber}`);
    console.log(`  │ Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`  │ Status: ${receipt.status === 1 ? 'Success ✓' : 'Failed ✗'}`);

    if (receipt.contractAddress) {
      console.log(`  │ Contract deployed at: ${receipt.contractAddress}`);
    }

    console.log('  └─────────────────────────────────────────────────');

    // Save transaction receipt info
    const receiptInfo = {
      mode: txData.mode || 'deploy',
      functionName: txData.functionName || null,
      transactionHash: receipt.hash,
      from: txData.deployer || txData.from,
      to: txData.to || null,
      contractAddress: receipt.contractAddress || null,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      status: receipt.status === 1 ? 'success' : 'failed',
      timestamp: new Date().toISOString(),
      network: {
        name: network.name,
        chainId: Number(network.chainId)
      }
    };

    if (txData.value && txData.value !== '0') {
      receiptInfo.value = txData.value;
    }

    const infoFile = txFile.replace('.json', '-receipt.json');
    fs.writeFileSync(infoFile, JSON.stringify(receiptInfo, null, 2));
    console.log(`\n📝 Transaction receipt saved to: ${infoFile}`);

    if (receipt.contractAddress) {
      console.log(`\n✅ Contract successfully deployed at: ${receipt.contractAddress}`);
    } else if (txData.mode === 'call') {
      console.log(`\n✅ Function call '${txData.functionName}' executed successfully!`);
    }

    console.log('\n✅ Done!\n');

  } catch (error) {
    console.error('\n❌ Error broadcasting transaction:', error.message);

    if (error.code === 'NONCE_EXPIRED') {
      console.error('\n   The nonce has already been used.');
      console.error('   This transaction may have already been broadcast.');
    } else if (error.code === 'REPLACEMENT_UNDERPRICED') {
      console.error('\n   A transaction with the same nonce exists with higher gas price.');
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error('\n   Insufficient funds to cover gas costs.');
    }

    if (error.reason) {
      console.error(`   Reason: ${error.reason}`);
    }

    process.exit(1);
  }
}

broadcastTransaction();
