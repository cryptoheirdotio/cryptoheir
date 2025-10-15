# Quick Start Guide

This guide will help you get CryptoHeir up and running in minutes.

## Prerequisites

Make sure you have the following installed:
- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- [Node.js](https://nodejs.org/) (v16+)
- [MetaMask](https://metamask.io/) browser extension

## Step 1: Install Dependencies

```bash
# Install Foundry dependencies (already done during init)
cd foundry
forge install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

## Step 2: Test the Smart Contract

Run the test suite to ensure everything works:

```bash
cd foundry
forge test -vv
```

You should see all 19 tests pass.

## Step 3: Start Local Blockchain

Open a new terminal and start Anvil (local Ethereum node):

```bash
anvil
```

Keep this terminal running. Anvil will provide you with test accounts and private keys.

## Step 4: Deploy Contract

In another terminal, deploy the contract to your local blockchain:

```bash
cd foundry
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

Note: The private key above is the first default Anvil account - safe for local testing only!

Copy the deployed contract address from the output (it will look like `0x...`).

## Step 5: Start the Frontend

```bash
cd frontend
npm run dev
```

The app will open at `http://localhost:5173`

## Step 6: Connect MetaMask to Local Network

1. Open MetaMask
2. Click the network dropdown (top right)
3. Click "Add Network" > "Add a network manually"
4. Enter:
   - Network Name: `Localhost 8545`
   - RPC URL: `http://localhost:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`
5. Save and switch to this network

## Step 7: Import Test Account

Import one of the Anvil test accounts into MetaMask:

1. Click account icon > "Import Account"
2. Paste private key from Anvil output (e.g., the first one: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`)
3. You should now have 10000 ETH for testing

## Step 8: Use the Application

1. Click "Connect Wallet" in the app
2. Approve the connection in MetaMask
3. Paste the deployed contract address from Step 4
4. Click "Set Contract"
5. You're ready to create inheritances!

## Example Usage

### Create an Inheritance

1. **Beneficiary Address**: Use another Anvil address (e.g., `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`)
2. **Amount**: `0.1` ETH
3. **Lock Period**: `30` days
4. Click "Deposit"
5. Confirm in MetaMask
6. Note the Inheritance ID returned

### Test Claiming (After Deadline)

Since testing a 30-day wait isn't practical, you can:

1. Edit the lock period to `1` day
2. Or use Anvil's time manipulation:
```bash
cast rpc evm_increaseTime 2592000  # 30 days in seconds
cast rpc evm_mine
```

Then:
1. Import the beneficiary account into MetaMask
2. Switch to that account
3. Load the inheritance by ID
4. Click "Claim Funds"

### Test Reclaiming (Before Deadline)

1. Switch back to the depositor account
2. Load the inheritance by ID
3. Click "Reclaim Funds" (only works before deadline)

### Test Extending Deadline

1. As the depositor
2. Load the inheritance by ID
3. Enter new number of days
4. Click "Extend Deadline"

## Deploying to Testnet

To deploy to a real testnet like Sepolia:

1. Get testnet ETH from a faucet
2. Create `.env` file:
```bash
PRIVATE_KEY=your_private_key
RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
```

3. Deploy:
```bash
source .env
cd foundry
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast
```

4. Update MetaMask to Sepolia network
5. Use the deployed contract address in the frontend

## Troubleshooting

### MetaMask shows "Nonce too high"
- Reset your account: Settings > Advanced > Clear activity tab data

### Contract call fails
- Make sure you're on the right network (Localhost 8545)
- Verify the contract address is correct
- Check you have enough ETH for gas

### Frontend won't connect
- Make sure MetaMask is installed
- Check you're on the correct network
- Try refreshing the page

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Explore the smart contract code in `foundry/src/CryptoHeir.sol`
- Check out the tests in `foundry/test/CryptoHeir.t.sol`
- Customize the frontend in `frontend/src/`

Happy coding!
