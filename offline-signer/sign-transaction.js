import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

/**
 * Sign transaction OFFLINE (no network access required)
 *
 * Reads prepared transaction parameters, displays them for review,
 * and signs the transaction with your private key.
 *
 * Usage: node sign-transaction.js <tx-params-file> [output-file]
 */

function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

function displayTransactionDetails(txData) {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('         TRANSACTION REVIEW');
  console.log('═══════════════════════════════════════════════════\n');

  console.log('Transaction Type:');
  console.log(`  ${txData.mode === 'deploy' ? 'Contract Deployment' : `Function Call: ${txData.functionName}`}\n`);

  if (txData.mode === 'call') {
    console.log('Function Parameters:');
    Object.entries(txData.params).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    console.log();
  }

  console.log('Network Information:');
  console.log(`  Network: ${txData.metadata.network.name}`);
  console.log(`  Chain ID: ${txData.metadata.network.chainId}\n`);

  console.log('Transaction Details:');
  console.log(`  From: ${txData.transaction.from}`);
  if (txData.transaction.to) {
    console.log(`  To: ${txData.transaction.to}`);
  }
  if (txData.transaction.value) {
    console.log(`  Value: ${ethers.formatEther(txData.transaction.value)} ETH`);
  }
  console.log(`  Nonce: ${txData.transaction.nonce}`);
  console.log(`  Gas Limit: ${txData.transaction.gasLimit}\n`);

  if (txData.transaction.type === 2) {
    console.log('Gas Fees (EIP-1559):');
    console.log(`  Max Fee Per Gas: ${ethers.formatUnits(txData.transaction.maxFeePerGas, 'gwei')} gwei`);
    console.log(`  Max Priority Fee: ${ethers.formatUnits(txData.transaction.maxPriorityFeePerGas, 'gwei')} gwei`);
  } else {
    console.log('Gas Fees (Legacy):');
    console.log(`  Gas Price: ${ethers.formatUnits(txData.transaction.gasPrice, 'gwei')} gwei`);
  }

  console.log(`\nEstimated Maximum Cost: ${txData.metadata.estimatedCost} ETH`);

  console.log('\n═══════════════════════════════════════════════════\n');
}

async function signTransaction() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: node sign-transaction.js <tx-params-file> [output-file]');
    console.error('\nExample:');
    console.error('  node sign-transaction.js tx-params.json signed-tx.json');
    process.exit(1);
  }

  const inputFile = args[0];
  const outputFile = args[1] || 'signed-tx.json';

  console.log('CryptoHeir Offline Transaction Signer');
  console.log('=====================================\n');
  console.log('⚠️  OFFLINE MODE - No network access required\n');

  // Validate private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('Error: PRIVATE_KEY not set in .env file');
    process.exit(1);
  }

  try {
    // Load transaction parameters
    if (!fs.existsSync(inputFile)) {
      console.error(`Error: Transaction parameters file not found: ${inputFile}`);
      process.exit(1);
    }

    console.log(`✓ Loading transaction parameters from: ${inputFile}`);
    const txData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

    if (!txData.transaction || !txData.metadata) {
      console.error('Error: Invalid transaction parameters file format');
      process.exit(1);
    }

    if (!txData.metadata.prepared) {
      console.error('Error: Transaction parameters have not been properly prepared');
      process.exit(1);
    }

    if (txData.metadata.signed) {
      console.error('⚠️  Warning: This transaction appears to have already been signed!');
      const proceed = await askConfirmation('Do you want to sign it again? (yes/no): ');
      if (!proceed) {
        console.log('\nTransaction signing cancelled.');
        process.exit(0);
      }
    }

    // Create wallet (offline - no provider)
    const wallet = new ethers.Wallet(privateKey);
    console.log(`✓ Loaded wallet: ${wallet.address}\n`);

    // Verify wallet address matches
    if (wallet.address.toLowerCase() !== txData.transaction.from.toLowerCase()) {
      console.error('❌ Error: Wallet address mismatch!');
      console.error(`  Transaction from: ${txData.transaction.from}`);
      console.error(`  Your wallet: ${wallet.address}`);
      console.error('\n  The private key does not match the transaction sender.');
      process.exit(1);
    }

    // Display transaction for review
    displayTransactionDetails(txData);

    // Ask for confirmation
    const confirmed = await askConfirmation('Do you want to sign this transaction? (yes/no): ');

    if (!confirmed) {
      console.log('\n❌ Transaction signing cancelled by user.\n');
      process.exit(0);
    }

    // Build transaction object
    const tx = {
      type: txData.transaction.type,
      from: txData.transaction.from,
      to: txData.transaction.to || undefined,
      data: txData.transaction.data,
      nonce: txData.transaction.nonce,
      chainId: txData.transaction.chainId,
      gasLimit: txData.transaction.gasLimit
    };

    if (txData.transaction.value) {
      tx.value = txData.transaction.value;
    }

    if (tx.type === 2) {
      tx.maxFeePerGas = txData.transaction.maxFeePerGas;
      tx.maxPriorityFeePerGas = txData.transaction.maxPriorityFeePerGas;
    } else {
      tx.gasPrice = txData.transaction.gasPrice;
    }

    // Sign the transaction
    console.log('\n✓ Signing transaction...');
    const signedTx = await wallet.signTransaction(tx);

    // Parse signed transaction to get hash
    const parsedTx = ethers.Transaction.from(signedTx);
    const txHash = parsedTx.hash;

    // Calculate predicted contract address for deployments
    let predictedAddress = null;
    if (txData.mode === 'deploy') {
      predictedAddress = ethers.getCreateAddress({
        from: wallet.address,
        nonce: txData.transaction.nonce
      });
    }

    // Prepare output data
    const output = {
      signedTransaction: signedTx,
      txHash: txHash,
      mode: txData.mode,
      functionName: txData.functionName,
      from: wallet.address,
      to: tx.to || null,
      value: tx.value ? ethers.formatEther(tx.value) : '0',
      nonce: tx.nonce,
      chainId: tx.chainId,
      gasLimit: tx.gasLimit.toString(),
      predictedContractAddress: predictedAddress,
      metadata: {
        ...txData.metadata,
        signed: true,
        signedAt: new Date().toISOString()
      }
    };

    if (tx.type === 2) {
      output.maxFeePerGas = tx.maxFeePerGas.toString();
      output.maxPriorityFeePerGas = tx.maxPriorityFeePerGas.toString();
    } else {
      output.gasPrice = tx.gasPrice.toString();
    }

    // Save signed transaction
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));

    console.log('✓ Transaction signed successfully!');
    console.log('\n═══════════════════════════════════════════════════');
    console.log('         SIGNING COMPLETE');
    console.log('═══════════════════════════════════════════════════\n');
    console.log(`  Transaction Hash: ${txHash}`);
    if (predictedAddress) {
      console.log(`  Predicted Contract Address: ${predictedAddress}`);
    }
    console.log(`  Signed transaction saved to: ${outputFile}`);
    console.log('\n═══════════════════════════════════════════════════\n');

    console.log('📤 Next step:');
    console.log(`  Transfer ${outputFile} to your ONLINE machine`);
    console.log(`  Then run: node broadcast-transaction.js ${outputFile}\n`);

  } catch (error) {
    console.error('\n❌ Error signing transaction:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    if (error.reason) {
      console.error(`   Reason: ${error.reason}`);
    }
    process.exit(1);
  }
}

signTransaction();
