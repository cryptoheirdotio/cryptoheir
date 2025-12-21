# CryptoHeir Offline Signer

This directory contains scripts for secure offline signing of CryptoHeir transactions. This approach enhances security by allowing you to sign transactions on an air-gapped machine that never connects to the network.

## Features

- **True Air-Gap Security**: Private key stays on offline machine with ZERO network access
- **3-Part Workflow**: Separate preparation, signing, and broadcasting steps
- **Contract Deployment**: Deploy CryptoHeir contracts securely
- **Function Calls**: Execute contract functions (deposit, claim, reclaim, extendDeadline)
- **Transaction Review**: Review all transaction details before signing
- **Manual Gas Override**: Customize gas parameters for optimal costs
- **Contract Address Prediction**: Know the deployment address before broadcasting

## Security Model

```
┌──────────────────────────────────────────────────────────────────────┐
│                   Air-Gapped Signing Workflow                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STEP 1: PREPARE (ONLINE MACHINE)                                    │
│  ├─ Has: RPC_URL, SIGNER_ADDRESS                                     │
│  ├─ Does NOT have: PRIVATE_KEY                                       │
│  └─ Runs: node prepare-transaction.js --deploy                       │
│     → Outputs: tx-params.json (unsigned)                             │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────   │
│  TRANSFER: Copy tx-params.json to offline machine (USB/QR code)      │
│  ─────────────────────────────────────────────────────────────────   │
│                                                                      │
│  STEP 2: SIGN (OFFLINE MACHINE - AIR-GAPPED)                         │
│  ├─ Has: PRIVATE_KEY                                                 │
│  ├─ NO network access required                                       │
│  ├─ Displays transaction details for review                          │
│  └─ Runs: node sign-transaction.js tx-params.json                    │
│     → Outputs: signed-tx.json                                        │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────   │
│  TRANSFER: Copy signed-tx.json to online machine (USB/QR code)       │
│  ─────────────────────────────────────────────────────────────────   │
│                                                                      │
│  STEP 3: BROADCAST (ONLINE MACHINE)                                  │
│  ├─ Has: RPC_URL                                                     │
│  ├─ Does NOT need: PRIVATE_KEY                                       │
│  └─ Runs: node broadcast-transaction.js signed-tx.json               │
│     → Broadcasts transaction to network                              │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Node.js v16 or higher
- Compiled CryptoHeir contract (run `forge build` in the `foundry` directory)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file from the example:
```bash
cp .env.example .env
```

3. Edit `.env` and configure:

**For ONLINE machine (prepare + broadcast):**
```bash
SIGNER_ADDRESS=0xYOUR_ADDRESS_HERE
INFURA_API_KEY=YOUR_INFURA_API_KEY_HERE

# Optional: Set default contract address for function calls
# CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS_HERE
```

**For OFFLINE machine (sign only):**
```bash
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
```

**Notes:**
- If you prefer a custom RPC provider instead of Infura, set `RPC_URL` in `.env` and don't use the `--network` parameter.
- Setting `CONTRACT_ADDRESS` is optional but convenient if you frequently interact with the same contract. You can still override it with `--contract` flag.

## Usage

### Workflow 1: Deploy Contract

#### Step 1: Prepare Transaction (Online Machine)

```bash
node prepare-transaction.js --deploy --network <network-name> [options]
```

**Required:**
- `--network <name>`: Network name for Infura. Supported networks:
  - **Ethereum**: `mainnet`, `sepolia`, `holesky`
  - **Polygon**: `polygon`, `polygon-mainnet`, `polygon-amoy`
  - **Arbitrum**: `arbitrum`, `arbitrum-mainnet`, `arbitrum-sepolia`
  - **Optimism**: `optimism`, `optimism-mainnet`, `optimism-sepolia`
  - **Base**: `base`, `base-mainnet`, `base-sepolia`
  - **Linea**: `linea`, `linea-mainnet`, `linea-sepolia`

**Options:**
- `--output <file>`: Output file (default: `tx-params.json`)
- `--contract <address>`: Contract address (required for function calls, or set CONTRACT_ADDRESS in .env)
- `--gas-limit <amount>`: Override gas limit
- `--gas-price <gwei>`: Override gas price (legacy tx)
- `--max-fee <gwei>`: Override max fee per gas (EIP-1559)
- `--priority-fee <gwei>`: Override priority fee (EIP-1559)

**Example:**
```bash
node prepare-transaction.js --deploy --network sepolia
```

**Example with custom output:**
```bash
node prepare-transaction.js --deploy --network mainnet --output deploy-params.json
```

**Example with manual gas:**
```bash
node prepare-transaction.js --deploy --network sepolia --max-fee 30 --priority-fee 2
```

This will:
- Connect to the network
- Fetch current nonce, gas prices, and network info
- Load contract bytecode
- Estimate gas for deployment
- Save unsigned transaction parameters to `tx-params.json`

#### Step 2: Sign Transaction (Offline Machine)

Transfer `tx-params.json` to your offline machine, then:

```bash
node sign-transaction.js tx-params.json [signed-tx.json]
```

This will:
- Load transaction parameters
- Display human-readable transaction details
- **Prompt for confirmation**
- Sign with your private key
- Save signed transaction to `signed-tx.json`

**Example output:**
```
═══════════════════════════════════════════════════
         TRANSACTION REVIEW
═══════════════════════════════════════════════════

Transaction Type:
  Contract Deployment

Network Information:
  Network: sepolia
  Chain ID: 11155111

Transaction Details:
  From: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
  Nonce: 0
  Gas Limit: 543210

Gas Fees (EIP-1559):
  Max Fee Per Gas: 20.5 gwei
  Max Priority Fee: 1.5 gwei

Estimated Maximum Cost: 0.011138505 ETH

═══════════════════════════════════════════════════

Do you want to sign this transaction? (yes/no): yes

✓ Transaction signed successfully!
```

#### Step 3: Broadcast Transaction (Online Machine)

Transfer `signed-tx.json` to your online machine, then:

```bash
node broadcast-transaction.js signed-tx.json
```

This will:
- Load the signed transaction
- Verify chain ID matches
- Broadcast to the network
- Wait for confirmation
- Display deployed contract address
- Save receipt to `signed-tx-receipt.json`

### Workflow 2: Function Calls

#### Deposit Function

**Step 1: Prepare (Online)**
```bash
node prepare-transaction.js --call deposit \
  --network sepolia \
  --contract 0xCONTRACT_ADDRESS \
  --beneficiary 0xBENEFICIARY_ADDRESS \
  --deadline 1735689600 \
  --value 0.1
```

**Step 2: Sign (Offline)**
```bash
node sign-transaction.js tx-params.json
```

**Step 3: Broadcast (Online)**
```bash
node broadcast-transaction.js signed-tx.json
```
*Note: Network info is automatically read from signed-tx.json*

#### Claim Function

**Step 1: Prepare (Online)**
```bash
# If CONTRACT_ADDRESS is set in .env, you can omit --contract
node prepare-transaction.js --call claim \
  --network sepolia \
  --inheritance-id 0

# Or specify --contract explicitly
node prepare-transaction.js --call claim \
  --network sepolia \
  --contract 0xCONTRACT_ADDRESS \
  --inheritance-id 0
```

**Step 2-3:** Same as above

#### Reclaim Function

**Step 1: Prepare (Online)**
```bash
node prepare-transaction.js --call reclaim \
  --network sepolia \
  --contract 0xCONTRACT_ADDRESS \
  --inheritance-id 0
```

**Step 2-3:** Same as above

#### Extend Deadline Function

**Step 1: Prepare (Online)**
```bash
node prepare-transaction.js --call extendDeadline \
  --network sepolia \
  --contract 0xCONTRACT_ADDRESS \
  --inheritance-id 0 \
  --deadline 1767225600
```

**Step 2-3:** Same as above

## Advanced Features

### Manual Gas Override

Override automatic gas estimation:

```bash
# EIP-1559 (modern networks)
node prepare-transaction.js --deploy \
  --network sepolia \
  --gas-limit 600000 \
  --max-fee 50 \
  --priority-fee 2

# Legacy (older networks)
node prepare-transaction.js --deploy \
  --network sepolia \
  --gas-limit 600000 \
  --gas-price 25
```

### Custom Output Files

```bash
node prepare-transaction.js --deploy --network mainnet --output my-deploy.json
node sign-transaction.js my-deploy.json my-signed.json
node broadcast-transaction.js my-signed.json
```

### Using Default Contract Address

If you frequently interact with the same contract, set it in `.env` to avoid typing it every time:

```bash
# In .env
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

Then you can omit `--contract` flag:

```bash
# With CONTRACT_ADDRESS in .env
node prepare-transaction.js --call claim --network sepolia --inheritance-id 0

# Or override with --contract flag
node prepare-transaction.js --call claim --network sepolia --inheritance-id 0 --contract 0xOTHER_CONTRACT
```

### Using Custom RPC Provider

If you don't want to use Infura, set `RPC_URL` in `.env`:

```bash
# In .env
RPC_URL=https://your-custom-rpc-provider.com
SIGNER_ADDRESS=0xYOUR_ADDRESS_HERE
```

Then run without the `--network` parameter:

```bash
node prepare-transaction.js --deploy
```

## File Structure

After running the workflow:

```
offline-signer/
├── tx-params.json           # Unsigned transaction parameters (from prepare)
├── signed-tx.json           # Signed transaction (from sign)
└── signed-tx-receipt.json   # Transaction receipt (from broadcast)
```

### tx-params.json (Unsigned)

```json
{
  "mode": "deploy",
  "functionName": "deploy",
  "params": {},
  "transaction": {
    "type": 2,
    "from": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "to": null,
    "data": "0x608060...",
    "nonce": 0,
    "chainId": 11155111,
    "gasLimit": "543210",
    "maxFeePerGas": "20500000000",
    "maxPriorityFeePerGas": "1500000000"
  },
  "metadata": {
    "network": {
      "name": "sepolia",
      "chainId": 11155111
    },
    "estimatedCost": "0.011138505",
    "timestamp": "2024-11-27T12:00:00.000Z",
    "prepared": true,
    "signed": false
  }
}
```

### signed-tx.json (Signed)

```json
{
  "signedTransaction": "0x02f8...",
  "txHash": "0x1234...abcd",
  "mode": "deploy",
  "functionName": "deploy",
  "from": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "to": null,
  "value": "0",
  "nonce": 0,
  "chainId": 11155111,
  "gasLimit": "543210",
  "predictedContractAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "metadata": {
    "signed": true,
    "signedAt": "2024-11-27T12:01:00.000Z"
  }
}
```

### signed-tx-receipt.json (Receipt)

```json
{
  "mode": "deploy",
  "functionName": null,
  "transactionHash": "0x1234...abcd",
  "from": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "to": null,
  "contractAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "blockNumber": 12345678,
  "gasUsed": "521043",
  "status": "success",
  "timestamp": "2024-11-27T12:05:00.000Z",
  "network": {
    "name": "sepolia",
    "chainId": 11155111
  }
}
```

## Supported Networks

### Pre-configured Networks (via Infura)

The following networks are pre-configured and validated:

**Ethereum Networks:**
- `mainnet` - Ethereum Mainnet
- `sepolia` - Ethereum Sepolia Testnet
- `holesky` - Ethereum Holesky Testnet

**Polygon Networks:**
- `polygon` or `polygon-mainnet` - Polygon Mainnet
- `polygon-amoy` - Polygon Amoy Testnet

**Arbitrum Networks:**
- `arbitrum` or `arbitrum-mainnet` - Arbitrum One Mainnet
- `arbitrum-sepolia` - Arbitrum Sepolia Testnet

**Optimism Networks:**
- `optimism` or `optimism-mainnet` - Optimism Mainnet
- `optimism-sepolia` - Optimism Sepolia Testnet

**Base Networks:**
- `base` or `base-mainnet` - Base Mainnet
- `base-sepolia` - Base Sepolia Testnet

**Linea Networks:**
- `linea` or `linea-mainnet` - Linea Mainnet
- `linea-sepolia` - Linea Sepolia Testnet

### Custom Networks

For networks not in the pre-configured list, set `RPC_URL` directly in `.env`:

```bash
# Example: Local Anvil
RPC_URL=http://localhost:8545

# Example: Custom RPC provider
RPC_URL=https://your-custom-rpc.com
```

## Security Best Practices

### 1. Air-Gapped Signing
- **Best**: Use a completely offline computer for signing that has NEVER connected to the internet
- Store private key only on the offline machine
- Transfer files via USB drive or QR codes
- Verify transaction details match before signing

### 2. Private Key Management
- Never commit `.env` file to version control
- Use a dedicated deployment wallet with minimal funds
- Consider hardware wallets for production deployments
- Never transfer private keys between machines

### 3. Transaction Verification
- Always review transaction details during signing
- Verify the `from` address matches your wallet
- Check gas fees are reasonable
- Confirm chain ID matches intended network
- Save predicted contract addresses

### 4. Network Security
- Use trusted RPC providers
- Verify RPC URLs before preparing transactions
- Double-check chain ID on both online and offline steps

### 5. File Transfer Security
- Use encrypted USB drives for file transfer
- Verify file integrity after transfer
- Delete transaction files after broadcasting
- Never expose signed transactions publicly

## Troubleshooting

### Error: Contract artifact not found

Build the contract first:
```bash
cd ../foundry
forge build
cd ../offline-signer
```

### Error: PRIVATE_KEY not set

Ensure `.env` file exists on offline machine:
```bash
cp .env.example .env
# Edit .env and add PRIVATE_KEY
```

### Error: SIGNER_ADDRESS not set

Ensure `.env` file exists on online machine:
```bash
cp .env.example .env
# Edit .env and add SIGNER_ADDRESS and INFURA_API_KEY (or RPC_URL)
```

### Error: Chain ID mismatch

The transaction was prepared for a different network than you're broadcasting to. Re-prepare with the correct RPC_URL.

### Error: Wallet address mismatch

The private key on your offline machine doesn't match the SIGNER_ADDRESS used to prepare the transaction.

### Error: NONCE_EXPIRED

The nonce has been used. The transaction may have already been broadcast. Check on a block explorer using the transaction hash.

### Error: INSUFFICIENT_FUNDS

Your wallet doesn't have enough ETH to cover gas costs. Check the estimated cost and add funds.

## Related Documentation

- [CryptoHeir Main README](../README.md)
- [Foundry Documentation](https://book.getfoundry.sh/)
- [ethers.js Documentation](https://docs.ethers.org/)

## License

MIT
