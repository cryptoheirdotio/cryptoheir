# Testing prepare-transaction.js

This guide explains how to test the `prepare-transaction.js` script with the updated contract functions.

## Quick Start

```bash
cd offline-signer
./test-prepare.sh
```

The test script will:
1. ✅ Start Anvil automatically (or use existing instance)
2. ✅ Build the contract if needed
3. ✅ Run all test cases
4. ✅ Validate outputs
5. ✅ Generate detailed test reports
6. ✅ Clean up automatically

## What Gets Tested

The test suite covers:

### ✓ Contract Deployment
- Deploy CryptoHeir contract

### ✓ Deposit Functions
- **Native token deposit (default)** - without `--token` flag
- **Native token deposit (explicit)** - with `--token 0x0000...`
- **ERC20 token deposit** - with `--token <address>` and `--amount`

### ✓ Management Functions
- **Claim** inheritance
- **Reclaim** inheritance
- **Extend deadline**

### ✓ Fee Collector Functions
- **Transfer fee collector** (initiate 2-step transfer)
- **Accept fee collector** (complete transfer)

### ✓ Error Validation
- ERC20 deposit without `--amount` (should fail)
- Native token deposit without `--value` (should fail)

## Test Output

### Console Output

The script provides colored, formatted output:

```
╔════════════════════════════════════════════════════════════════╗
║  CryptoHeir prepare-transaction.js Test Suite                 ║
║  Testing with Foundry Local Node (Anvil)                      ║
╚════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST: Deploy Contract
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Command executed successfully
✓ Output file validated: ./test-outputs/01-deploy.json
    Mode: deploy
    Data length: 12345 chars
    Chain ID: 31337
    Nonce: 0
    Gas Limit: 543210
✓ Test 1 PASSED
```

### Output Files

All test outputs are saved to `./test-outputs/`:

```
test-outputs/
├── 01-deploy.json
├── 02-deposit-native-default.json
├── 03-deposit-native-explicit.json
├── 04-deposit-erc20.json
├── 05-claim.json
├── 06-reclaim.json
├── 07-extend-deadline.json
├── 08-transfer-fee-collector.json
└── 09-accept-fee-collector.json
```

Each file contains the prepared transaction parameters that can be used for signing.

## Manual Testing

If you prefer to test specific functions manually:

### 1. Setup

```bash
# Start anvil
cd ../foundry
anvil

# In another terminal
cd ../offline-signer

# Create .env
cat > .env << EOF
SIGNER_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
RPC_URL=http://127.0.0.1:8545
EOF

# Build contract
cd ../foundry && forge build && cd ../offline-signer
```

### 2. Test Individual Functions

#### Deploy:
```bash
node prepare-transaction.js --deploy
```

#### Native Token Deposit:
```bash
node prepare-transaction.js --call deposit \
  --beneficiary 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
  --deadline 1735689600 \
  --value 0.1 \
  --contract 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

#### ERC20 Token Deposit:
```bash
node prepare-transaction.js --call deposit \
  --token 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \
  --beneficiary 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
  --amount 1000000 \
  --deadline 1735689600 \
  --contract 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

#### Claim:
```bash
node prepare-transaction.js --call claim \
  --inheritance-id 0 \
  --contract 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

#### Transfer Fee Collector:
```bash
node prepare-transaction.js --call transferFeeCollector \
  --new-fee-collector 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
  --contract 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

#### Accept Fee Collector:
```bash
node prepare-transaction.js --call acceptFeeCollector \
  --contract 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

## Troubleshooting

### "Anvil not responding"
Make sure anvil is running:
```bash
cd ../foundry
anvil
```

### "Contract artifact not found"
Build the contract:
```bash
cd ../foundry
forge build
```

### "SIGNER_ADDRESS not set"
Create the `.env` file with the test address:
```bash
echo "SIGNER_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" > .env
echo "RPC_URL=http://127.0.0.1:8545" >> .env
```

### "Connection refused"
Check if anvil is running on port 8545:
```bash
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://127.0.0.1:8545
```

## Test Script Features

- **Auto-start Anvil**: Automatically starts anvil if not running
- **Auto-build Contract**: Builds contract if needed
- **Colored Output**: Easy to read test results
- **Detailed Validation**: Checks JSON structure, parameters, and encoding
- **Error Testing**: Validates error cases work correctly
- **Auto-cleanup**: Stops anvil and cleans up on exit
- **Exit Codes**: Returns 0 on success, 1 on failure (for CI/CD)

## CI/CD Integration

The test script is designed to work in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Test prepare-transaction.js
  run: |
    cd offline-signer
    npm install
    ./test-prepare.sh
```

The script will:
- Exit with code 0 if all tests pass
- Exit with code 1 if any test fails
- Provide detailed error messages

## Expected Results

When all tests pass, you should see:

```
╔════════════════════════════════════════════════════════════════╗
║                      TEST SUMMARY                              ║
╚════════════════════════════════════════════════════════════════╝

✓ Deploy Contract
✓ Deposit Native Token (default)
✓ Deposit Native Token (explicit)
✓ Deposit ERC20 Token
✓ Claim
✓ Reclaim
✓ Extend Deadline
✓ Transfer Fee Collector
✓ Accept Fee Collector
✓ Error: ERC20 without amount
✓ Error: Native without value

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Tests: 11
Passed: 11
Failed: 0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Test output files saved to: ./test-outputs/

🎉 ALL TESTS PASSED! 🎉
```

## Cleaning Up

Test files are saved to `./test-outputs/`. To clean up:

```bash
rm -rf test-outputs/
rm .env
```

The test script automatically stops anvil when it exits.
