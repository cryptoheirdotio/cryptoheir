# CryptoHeir

A decentralized time-locked fund transfer system built on EVM-compatible blockchains. CryptoHeir allows users to deposit funds for beneficiaries with customizable deadlines, providing a secure way to transfer assets with time constraints.

## Features

- **Deposit Funds**: Lock funds for a specific beneficiary with a deadline
- **Claim Funds**: Beneficiaries can claim funds after the deadline passes
- **Reclaim Funds**: Depositors can reclaim funds before the deadline
- **Extend Deadline**: Depositors can extend the deadline at any time
- **Web Interface**: User-friendly React frontend for interacting with the contract

## Tech Stack

### Smart Contract
- **Solidity ^0.8.13**
- **Foundry** - Development framework and testing
- **Forge** - Testing and deployment

### Frontend
- **React** - UI framework
- **Vite** - Build tool and dev server
- **ethers.js v6** - Web3 integration
- **MetaMask** - Wallet integration

## Project Structure

```
cryptoheir/
├── foundry/                # Foundry project
│   ├── src/                # Smart contracts
│   │   └── CryptoHeir.sol  # Main contract
│   ├── test/               # Contract tests
│   │   └── CryptoHeir.t.sol # Comprehensive test suite
│   ├── script/             # Deployment scripts
│   │   └── Deploy.s.sol    # Deployment script
│   └── foundry.toml        # Foundry configuration
└── frontend/               # React frontend
    ├── src/
    │   ├── components/     # React components
    │   ├── hooks/          # Custom hooks (Web3)
    │   └── utils/          # Contract ABI
    └── package.json
```

## Smart Contract

### CryptoHeir.sol

The main contract that handles all inheritance functionality.

**Key Functions:**
- `deposit(address _beneficiary, uint256 _deadline)` - Create a new inheritance
- `claim(uint256 _inheritanceId)` - Claim funds (beneficiary only, after deadline)
- `reclaim(uint256 _inheritanceId)` - Reclaim funds (depositor only, before deadline)
- `extendDeadline(uint256 _inheritanceId, uint256 _newDeadline)` - Extend the deadline
- `getInheritance(uint256 _inheritanceId)` - Get inheritance details

## Getting Started

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- [Node.js](https://nodejs.org/) (v16 or higher)
- [MetaMask](https://metamask.io/) browser extension

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd cryptoheir
```

2. Install Foundry dependencies:
```bash
cd foundry
forge install
cd ..
```

3. Install frontend dependencies:
```bash
cd frontend
npm install
```

## Smart Contract Development

### Build
```bash
cd foundry
forge build
```

### Test
Run all tests with detailed output:
```bash
cd foundry
forge test -vv
```

Run tests with gas reporting:
```bash
cd foundry
forge test --gas-report
```

### Deploy

#### Local Development (Anvil)

1. Start a local Ethereum node:
```bash
anvil
```

2. Deploy the contract:
```bash
cd foundry
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast --private-key <anvil-private-key>
```

#### Testnet/Mainnet Deployment

1. Create a `.env` file:
```bash
PRIVATE_KEY=your_private_key_here
RPC_URL=your_rpc_url_here
```

2. Deploy:
```bash
source .env
cd foundry
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast --verify
```

**Supported Networks:**
- Ethereum (Mainnet/Sepolia)
- Polygon (Mumbai/Mainnet)
- Arbitrum
- Optimism
- Any EVM-compatible blockchain

## Frontend Development

### Running the Development Server

```bash
cd frontend
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
cd frontend
npm run build
```

### Using the Application

1. **Connect Wallet**: Click "Connect Wallet" to connect MetaMask
2. **Set Contract Address**: Enter the deployed contract address
3. **Create Inheritance**:
   - Enter beneficiary address
   - Specify amount in ETH
   - Set lock period in days
   - Click "Deposit"
4. **Manage Inheritance**:
   - Enter inheritance ID
   - Click "Load" to view details
   - Use available actions (Claim/Reclaim/Extend)

## Contract Functions

### For Depositors

**deposit()**
- Deposit ETH for a beneficiary
- Set a deadline (timestamp)
- Returns unique inheritance ID

**reclaim()**
- Retrieve funds before deadline
- Only available to original depositor
- Marks inheritance as claimed

**extendDeadline()**
- Extend the deadline to a future date
- Only available to original depositor
- Cannot extend after funds are claimed

### For Beneficiaries

**claim()**
- Claim funds after deadline passes
- Only available to designated beneficiary
- Transfers full amount to beneficiary

### View Functions

**getInheritance()**
- Returns full inheritance details
- Public view function
- No gas cost

## Security Features

- **Access Control**: Strict checks for depositor/beneficiary permissions
- **Deadline Validation**: Ensures deadlines are in the future
- **No Reentrancy**: Uses checks-effects-interactions pattern
- **Custom Errors**: Gas-efficient error handling
- **Event Logging**: Complete audit trail
- **Comprehensive Tests**: 19 test cases covering all scenarios

## Testing

The test suite includes:
- Valid deposit scenarios
- Validation checks (zero address, past deadline, etc.)
- Claim functionality (before/after deadline)
- Reclaim functionality (before/after deadline)
- Deadline extension
- Access control verification
- Multiple inheritance handling

Run tests:
```bash
cd foundry
forge test -vv
```

## Gas Optimization

- Custom errors instead of revert strings
- Efficient storage layout
- Minimal external calls
- Optimized loops and conditionals

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT

## Contact & Support

For questions, issues, or feature requests, please open an issue on GitHub.

## Acknowledgments

- Built with [Foundry](https://book.getfoundry.sh/)
- Frontend powered by [React](https://react.dev/) and [Vite](https://vitejs.dev/)
- Web3 integration using [ethers.js](https://docs.ethers.org/)
