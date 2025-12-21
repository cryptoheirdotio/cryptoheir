import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Pre-configured networks with Infura identifiers
const SUPPORTED_NETWORKS = {
  // Ethereum networks
  'mainnet': 'mainnet',
  'sepolia': 'sepolia',
  'holesky': 'holesky',

  // Polygon networks
  'polygon': 'polygon-mainnet',
  'polygon-mainnet': 'polygon-mainnet',
  'polygon-amoy': 'polygon-amoy',

  // Arbitrum networks
  'arbitrum': 'arbitrum-mainnet',
  'arbitrum-mainnet': 'arbitrum-mainnet',
  'arbitrum-sepolia': 'arbitrum-sepolia',

  // Optimism networks
  'optimism': 'optimism-mainnet',
  'optimism-mainnet': 'optimism-mainnet',
  'optimism-sepolia': 'optimism-sepolia',

  // Base networks
  'base': 'base-mainnet',
  'base-mainnet': 'base-mainnet',
  'base-sepolia': 'base-sepolia',

  // Linea networks
  'linea': 'linea-mainnet',
  'linea-mainnet': 'linea-mainnet',
  'linea-sepolia': 'linea-sepolia'
};

/**
 * Prepare transaction parameters for offline signing (ONLINE - requires RPC)
 *
 * Usage:
 *   Deployment:
 *     node prepare-transaction.js --deploy --network sepolia [options]
 *
 *   Function calls:
 *     Native token deposit:
 *       node prepare-transaction.js --call deposit --network sepolia --beneficiary <address> --deadline <timestamp> --value <eth>
 *       node prepare-transaction.js --call deposit --network sepolia --token 0x0000000000000000000000000000000000000000 --beneficiary <address> --deadline <timestamp> --value <eth>
 *
 *     ERC20 token deposit:
 *       node prepare-transaction.js --call deposit --network sepolia --token <erc20-address> --beneficiary <address> --amount <tokens> --deadline <timestamp>
 *
 *     Other functions:
 *       node prepare-transaction.js --call claim --network mainnet --inheritance-id <id>
 *       node prepare-transaction.js --call reclaim --network polygon --inheritance-id <id>
 *       node prepare-transaction.js --call extendDeadline --network arbitrum --inheritance-id <id> --deadline <timestamp>
 *       node prepare-transaction.js --call transferFeeCollector --network mainnet --new-fee-collector <address>
 *       node prepare-transaction.js --call acceptFeeCollector --network mainnet
 *
 * Options:
 *   --network <name>          Pre-configured network name (required with INFURA_API_KEY)
 *                             Supported: mainnet, sepolia, holesky, polygon, polygon-amoy,
 *                                       arbitrum, arbitrum-sepolia, optimism, optimism-sepolia,
 *                                       base, base-sepolia, linea, linea-sepolia
 *                             Alternatively, set RPC_URL directly in .env for custom providers
 *   --output <file>           Output file (default: tx-params.json)
 *   --gas-limit <amount>      Override gas limit
 *   --gas-price <gwei>        Override gas price (legacy tx)
 *   --max-fee <gwei>          Override max fee per gas (EIP-1559)
 *   --priority-fee <gwei>     Override priority fee (EIP-1559)
 *   --contract <address>      Contract address (required for function calls)
 *   --token <address>         Token address (use 0x0000000000000000000000000000000000000000 for native, defaults to native)
 *   --amount <tokens>         Token amount (for ERC20 deposits, in token decimals)
 *   --value <eth>             Native token value (for native token deposits)
 *   --beneficiary <address>   Beneficiary address (for deposit)
 *   --deadline <timestamp>    Unix timestamp deadline (for deposit and extendDeadline)
 *   --inheritance-id <id>     Inheritance ID (for claim, reclaim, extendDeadline)
 *   --new-fee-collector <addr> New fee collector address (for transferFeeCollector)
 */

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    mode: null, // 'deploy' or 'call'
    functionName: null,
    params: {},
    options: {
      network: null,
      output: 'tx-params.json',
      gasLimit: null,
      gasPrice: null,
      maxFeePerGas: null,
      maxPriorityFeePerGas: null,
      contract: null
    }
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--deploy':
        parsed.mode = 'deploy';
        break;
      case '--call':
        parsed.mode = 'call';
        parsed.functionName = next;
        i++;
        break;
      case '--network':
        parsed.options.network = next;
        i++;
        break;
      case '--output':
        parsed.options.output = next;
        i++;
        break;
      case '--gas-limit':
        parsed.options.gasLimit = next;
        i++;
        break;
      case '--gas-price':
        parsed.options.gasPrice = next;
        i++;
        break;
      case '--max-fee':
        parsed.options.maxFeePerGas = next;
        i++;
        break;
      case '--priority-fee':
        parsed.options.maxPriorityFeePerGas = next;
        i++;
        break;
      case '--contract':
        parsed.options.contract = next;
        i++;
        break;
      case '--beneficiary':
        parsed.params.beneficiary = next;
        i++;
        break;
      case '--deadline':
        parsed.params.deadline = next;
        i++;
        break;
      case '--value':
        parsed.params.value = next;
        i++;
        break;
      case '--inheritance-id':
        parsed.params.inheritanceId = next;
        i++;
        break;
      case '--token':
        parsed.params.token = next;
        i++;
        break;
      case '--amount':
        parsed.params.amount = next;
        i++;
        break;
      case '--new-fee-collector':
        parsed.params.newFeeCollector = next;
        i++;
        break;
    }
  }

  return parsed;
}

function validateArgs(parsed) {
  if (!parsed.mode) {
    console.error('Error: Must specify --deploy or --call <function>');
    console.error('\nUsage examples:');
    console.error('  Deploy contract:');
    console.error('    node prepare-transaction.js --deploy --network sepolia');
    console.error('  Native token deposit:');
    console.error('    node prepare-transaction.js --call deposit --network sepolia --beneficiary 0x... --deadline 1735689600 --value 0.1');
    console.error('  ERC20 token deposit:');
    console.error('    node prepare-transaction.js --call deposit --network sepolia --token 0xABC... --beneficiary 0x... --amount 100 --deadline 1735689600');
    console.error('  Claim:');
    console.error('    node prepare-transaction.js --call claim --network mainnet --inheritance-id 0 --contract 0x...');
    process.exit(1);
  }

  // Validate network if provided
  if (parsed.options.network && !SUPPORTED_NETWORKS[parsed.options.network]) {
    console.error(`Error: Unsupported network: ${parsed.options.network}`);
    console.error('\nSupported networks:');
    console.error('  Ethereum: mainnet, sepolia, holesky');
    console.error('  Polygon: polygon, polygon-mainnet, polygon-amoy');
    console.error('  Arbitrum: arbitrum, arbitrum-mainnet, arbitrum-sepolia');
    console.error('  Optimism: optimism, optimism-mainnet, optimism-sepolia');
    console.error('  Base: base, base-mainnet, base-sepolia');
    console.error('  Linea: linea, linea-mainnet, linea-sepolia');
    console.error('\nAlternatively, set RPC_URL in .env for a custom provider');
    process.exit(1);
  }

  if (parsed.mode === 'call') {
    const validFunctions = ['deposit', 'claim', 'reclaim', 'extendDeadline', 'transferFeeCollector', 'acceptFeeCollector'];
    if (!validFunctions.includes(parsed.functionName)) {
      console.error(`Error: Invalid function name: ${parsed.functionName}`);
      console.error(`Valid functions: ${validFunctions.join(', ')}`);
      process.exit(1);
    }

    // Use CONTRACT_ADDRESS from .env as default if --contract not specified
    if (!parsed.options.contract) {
      parsed.options.contract = process.env.CONTRACT_ADDRESS;
    }

    if (!parsed.options.contract) {
      console.error('Error: --contract <address> is required for function calls');
      console.error('Either use --contract flag or set CONTRACT_ADDRESS in .env');
      process.exit(1);
    }

    // Validate function-specific params
    switch (parsed.functionName) {
      case 'deposit':
        if (!parsed.params.beneficiary || !parsed.params.deadline) {
          console.error('Error: deposit requires --beneficiary and --deadline');
          process.exit(1);
        }

        // Default token to address(0) for native token if not specified
        if (!parsed.params.token) {
          parsed.params.token = '0x0000000000000000000000000000000000000000';
        }

        // Normalize address(0) to proper format
        if (parsed.params.token.toLowerCase() === 'address(0)') {
          parsed.params.token = '0x0000000000000000000000000000000000000000';
        }

        // Validate based on token type
        const isNativeToken = parsed.params.token === '0x0000000000000000000000000000000000000000';

        if (isNativeToken) {
          // Native token: require --value, amount is ignored (default to 0)
          if (!parsed.params.value) {
            console.error('Error: Native token deposit requires --value');
            process.exit(1);
          }
          // Set amount to 0 as it's ignored by the contract for native tokens
          if (!parsed.params.amount) {
            parsed.params.amount = '0';
          }
        } else {
          // ERC20 token: require --amount, --value should not be set
          if (!parsed.params.amount) {
            console.error('Error: ERC20 token deposit requires --amount');
            console.error('Note: Provide amount in smallest unit (e.g., for USDC with 6 decimals, 1 USDC = 1000000)');
            process.exit(1);
          }
          if (parsed.params.value) {
            console.error('Error: Do not use --value for ERC20 deposits (use --amount instead)');
            process.exit(1);
          }
        }
        break;
      case 'claim':
      case 'reclaim':
        if (!parsed.params.inheritanceId && parsed.params.inheritanceId !== '0') {
          console.error(`Error: ${parsed.functionName} requires --inheritance-id`);
          process.exit(1);
        }
        break;
      case 'extendDeadline':
        if (!parsed.params.inheritanceId && parsed.params.inheritanceId !== '0') {
          console.error('Error: extendDeadline requires --inheritance-id');
          process.exit(1);
        }
        if (!parsed.params.deadline) {
          console.error('Error: extendDeadline requires --deadline');
          process.exit(1);
        }
        break;
      case 'transferFeeCollector':
        if (!parsed.params.newFeeCollector) {
          console.error('Error: transferFeeCollector requires --new-fee-collector');
          process.exit(1);
        }
        break;
      case 'acceptFeeCollector':
        // No parameters required
        break;
    }
  }
}

async function loadContractABI() {
  const artifactPath = path.join(__dirname, '../foundry/out/CryptoHeir.sol/CryptoHeir.json');

  if (!fs.existsSync(artifactPath)) {
    console.error('Error: Contract artifact not found at:', artifactPath);
    console.error('\nPlease build the contract first:');
    console.error('  cd foundry && forge build');
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return {
    abi: artifact.abi,
    bytecode: artifact.bytecode.object
  };
}

function encodeFunctionCall(abi, functionName, params) {
  const iface = new ethers.Interface(abi);

  switch (functionName) {
    case 'deposit':
      return iface.encodeFunctionData('deposit', [
        params.token,
        params.beneficiary,
        params.amount,
        params.deadline
      ]);
    case 'claim':
      return iface.encodeFunctionData('claim', [params.inheritanceId]);
    case 'reclaim':
      return iface.encodeFunctionData('reclaim', [params.inheritanceId]);
    case 'extendDeadline':
      return iface.encodeFunctionData('extendDeadline', [params.inheritanceId, params.deadline]);
    case 'transferFeeCollector':
      return iface.encodeFunctionData('transferFeeCollector', [params.newFeeCollector]);
    case 'acceptFeeCollector':
      return iface.encodeFunctionData('acceptFeeCollector', []);
    default:
      throw new Error(`Unknown function: ${functionName}`);
  }
}

function getRpcUrl(network) {
  // If RPC_URL is set in .env, use it directly (custom provider)
  const rpcUrl = process.env.RPC_URL;
  if (rpcUrl) {
    return rpcUrl;
  }

  // If network is provided, build Infura URL using pre-configured mapping
  if (network) {
    const infuraApiKey = process.env.INFURA_API_KEY;
    if (!infuraApiKey) {
      console.error('Error: INFURA_API_KEY not set in .env file');
      console.error('Either set INFURA_API_KEY or set RPC_URL for a custom provider');
      process.exit(1);
    }

    // Get the Infura network identifier from the mapping
    const infuraNetwork = SUPPORTED_NETWORKS[network];
    if (!infuraNetwork) {
      console.error(`Error: Network '${network}' is not in the supported networks list`);
      process.exit(1);
    }

    return `https://${infuraNetwork}.infura.io/v3/${infuraApiKey}`;
  }

  // Neither RPC_URL nor network provided
  console.error('Error: No RPC configuration found');
  console.error('Please either:');
  console.error('  1. Use --network <name> flag and set INFURA_API_KEY in .env');
  console.error('  2. Set RPC_URL in .env for a custom provider');
  console.error('\nSupported networks:');
  console.error('  Ethereum: mainnet, sepolia, holesky');
  console.error('  Polygon: polygon, polygon-mainnet, polygon-amoy');
  console.error('  Arbitrum: arbitrum, arbitrum-mainnet, arbitrum-sepolia');
  console.error('  Optimism: optimism, optimism-mainnet, optimism-sepolia');
  console.error('  Base: base, base-mainnet, base-sepolia');
  console.error('  Linea: linea, linea-mainnet, linea-sepolia');
  console.error('\nExamples:');
  console.error('  node prepare-transaction.js --deploy --network sepolia');
  console.error('  node prepare-transaction.js --deploy  # with RPC_URL in .env');
  process.exit(1);
}

async function prepareTransaction() {
  const parsed = parseArgs();
  validateArgs(parsed);

  console.log('CryptoHeir Transaction Preparation Tool (ONLINE)');
  console.log('================================================\n');

  // Get RPC URL (from network + Infura API key, or custom RPC_URL)
  const rpcUrl = getRpcUrl(parsed.options.network);

  // Validate signer address
  const signerAddress = process.env.SIGNER_ADDRESS;
  if (!signerAddress) {
    console.error('Error: SIGNER_ADDRESS not set in .env file');
    console.error('This is the address that will sign the transaction (for deployments and function calls)');
    process.exit(1);
  }

  try {
    // Connect to network
    console.log('✓ Connecting to network...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();
    console.log(`  Network: ${network.name} (Chain ID: ${network.chainId})`);

    // Get account nonce
    console.log('\n✓ Fetching account nonce...');
    const nonce = await provider.getTransactionCount(signerAddress);
    console.log(`  Current nonce: ${nonce}`);

    // Check balance
    const balance = await provider.getBalance(signerAddress);
    console.log(`  Account balance: ${ethers.formatEther(balance)} ETH`);

    // Get fee data
    console.log('\n✓ Fetching gas prices...');
    const feeData = await provider.getFeeData();

    let txType = 2; // Default to EIP-1559
    let gasPrice, maxFeePerGas, maxPriorityFeePerGas;

    if (parsed.options.gasPrice) {
      // User specified legacy gas price
      txType = 0;
      gasPrice = ethers.parseUnits(parsed.options.gasPrice, 'gwei');
      console.log(`  Gas price (manual): ${parsed.options.gasPrice} gwei`);
    } else if (parsed.options.maxFeePerGas && parsed.options.maxPriorityFeePerGas) {
      // User specified EIP-1559 fees
      maxFeePerGas = ethers.parseUnits(parsed.options.maxFeePerGas, 'gwei');
      maxPriorityFeePerGas = ethers.parseUnits(parsed.options.maxPriorityFeePerGas, 'gwei');
      console.log(`  Max fee per gas (manual): ${parsed.options.maxFeePerGas} gwei`);
      console.log(`  Max priority fee (manual): ${parsed.options.maxPriorityFeePerGas} gwei`);
    } else if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
      // Use network EIP-1559 fees
      maxFeePerGas = feeData.maxFeePerGas;
      maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
      console.log(`  Max fee per gas: ${ethers.formatUnits(maxFeePerGas, 'gwei')} gwei`);
      console.log(`  Max priority fee: ${ethers.formatUnits(maxPriorityFeePerGas, 'gwei')} gwei`);
    } else {
      // Fallback to legacy
      txType = 0;
      gasPrice = feeData.gasPrice;
      console.log(`  Gas price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    }

    // Build transaction data
    let txData, contract;

    if (parsed.mode === 'deploy') {
      console.log('\n✓ Loading contract bytecode...');
      contract = await loadContractABI();
      txData = contract.bytecode;

      if (!txData || txData === '0x') {
        console.error('Error: Invalid bytecode in contract artifact');
        process.exit(1);
      }

      console.log(`  Bytecode size: ${(txData.length / 2 - 1)} bytes`);
    } else {
      console.log(`\n✓ Encoding function call: ${parsed.functionName}...`);
      contract = await loadContractABI();
      txData = encodeFunctionCall(contract.abi, parsed.functionName, parsed.params);
      console.log(`  Encoded data: ${txData.substring(0, 10)}...`);
    }

    // Prepare transaction object for gas estimation
    const tx = {
      from: signerAddress,
      data: txData,
      nonce: nonce,
      chainId: network.chainId
    };

    if (parsed.mode === 'call') {
      tx.to = parsed.options.contract;

      // Verify contract exists at the address
      console.log(`\n✓ Verifying contract at ${parsed.options.contract}...`);
      const bytecode = await provider.getCode(parsed.options.contract);
      if (!bytecode || bytecode === '0x') {
        console.error(`Error: No contract found at address ${parsed.options.contract}`);
        console.error('Please verify the contract address is correct and the contract is deployed on this network.');
        process.exit(1);
      }
      console.log(`  Contract verified (bytecode size: ${(bytecode.length / 2 - 1)} bytes)`);

      // For ERC20 token deposits, verify token contract exists
      if (parsed.functionName === 'deposit' && parsed.params.token) {
        const isNativeToken = parsed.params.token === '0x0000000000000000000000000000000000000000';
        if (!isNativeToken) {
          console.log(`\n✓ Verifying ERC20 token contract at ${parsed.params.token}...`);
          const tokenBytecode = await provider.getCode(parsed.params.token);
          if (!tokenBytecode || tokenBytecode === '0x') {
            console.error(`Error: No contract found at token address ${parsed.params.token}`);
            console.error('Please verify the token address is correct and the token contract is deployed on this network.');
            process.exit(1);
          }
          console.log(`  Token contract verified (bytecode size: ${(tokenBytecode.length / 2 - 1)} bytes)`);
        }
      }

      // Add value for deposit function
      if (parsed.functionName === 'deposit' && parsed.params.value) {
        tx.value = ethers.parseEther(parsed.params.value);
      }
    }

    // Estimate gas or use manual override
    let gasLimit;
    if (parsed.options.gasLimit) {
      gasLimit = BigInt(parsed.options.gasLimit);
      console.log(`\n✓ Gas limit (manual): ${gasLimit.toString()}`);
    } else {
      console.log('\n✓ Estimating gas...');
      gasLimit = await provider.estimateGas(tx);
      console.log(`  Estimated gas: ${gasLimit.toString()}`);
    }

    // Build final transaction parameters
    const txParams = {
      type: txType,
      from: signerAddress,
      to: parsed.mode === 'call' ? parsed.options.contract : null,
      data: txData,
      nonce: nonce,
      chainId: Number(network.chainId),
      gasLimit: gasLimit.toString()
    };

    if (parsed.mode === 'call' && parsed.functionName === 'deposit' && parsed.params.value) {
      txParams.value = ethers.parseEther(parsed.params.value).toString();
    }

    if (txType === 2) {
      txParams.maxFeePerGas = maxFeePerGas.toString();
      txParams.maxPriorityFeePerGas = maxPriorityFeePerGas.toString();
    } else {
      txParams.gasPrice = gasPrice.toString();
    }

    // Calculate estimated cost
    let estimatedCost;
    if (txType === 2) {
      estimatedCost = gasLimit * maxFeePerGas;
    } else {
      estimatedCost = gasLimit * gasPrice;
    }

    // Add metadata
    const output = {
      mode: parsed.mode,
      functionName: parsed.functionName || 'deploy',
      params: parsed.params,
      transaction: txParams,
      metadata: {
        network: {
          name: network.name,
          chainId: Number(network.chainId)
        },
        estimatedCost: ethers.formatEther(estimatedCost),
        timestamp: new Date().toISOString(),
        prepared: true,
        signed: false
      }
    };

    // Save to file
    fs.writeFileSync(parsed.options.output, JSON.stringify(output, null, 2));

    console.log('\n✓ Transaction parameters prepared successfully!');
    console.log('  ┌─────────────────────────────────────────────────');
    console.log(`  │ Mode: ${parsed.mode}`);
    if (parsed.mode === 'call') {
      console.log(`  │ Function: ${parsed.functionName}`);
      console.log(`  │ Contract: ${parsed.options.contract}`);
    }
    console.log(`  │ Nonce: ${nonce}`);
    console.log(`  │ Chain ID: ${network.chainId}`);
    console.log(`  │ Gas Limit: ${gasLimit.toString()}`);
    console.log(`  │ Estimated Cost: ${ethers.formatEther(estimatedCost)} ETH`);
    console.log(`  │ Output file: ${parsed.options.output}`);
    console.log('  └─────────────────────────────────────────────────');

    console.log('\n📋 Next step:');
    console.log(`  Transfer ${parsed.options.output} to your OFFLINE machine`);
    console.log(`  Then run: node sign-transaction.js ${parsed.options.output}\n`);

  } catch (error) {
    console.error('\n❌ Error preparing transaction:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    if (error.reason) {
      console.error(`   Reason: ${error.reason}`);
    }
    process.exit(1);
  }
}

prepareTransaction();
