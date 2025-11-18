# CryptoHeir Frontend

A React-based frontend for the CryptoHeir inheritance contract, built with Vite, wagmi, and RainbowKit.

## Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **wagmi** - React hooks for Ethereum
- **viem** - TypeScript Ethereum library
- **RainbowKit** - Wallet connection UI
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS
- **DaisyUI** - Tailwind component library

## Prerequisites

- Node.js 18+ and npm
- A WalletConnect Cloud project ID (free at [cloud.walletconnect.com](https://cloud.walletconnect.com))

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**

   Copy the example file:
   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and add your WalletConnect project ID:
   ```env
   VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
   ```

3. **Configure contract addresses:**

   Edit `src/utils/networkConfig.js` to add your deployed contract addresses for each network:
   ```javascript
   export const NETWORKS = {
     foundryTestnet: {
       contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
       // ...
     },
     sepolia: {
       contractAddress: 'YOUR_SEPOLIA_ADDRESS', // Add here
       // ...
     },
     // ...
   }
   ```

## Development

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Building for Production

Build the application:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Supported Networks

The frontend supports multiple EVM chains:

- **Foundry Local Testnet** (Chain ID: 31337) - For local development
- **Sepolia Testnet** (Chain ID: 11155111) - Ethereum testnet
- **Ethereum Mainnet** (Chain ID: 1) - Production network

To add more networks, update `src/config/wagmi.js` and `src/utils/networkConfig.js`.

## Wallet Support

Through RainbowKit and wagmi, the app supports:

- **Injected wallets**: MetaMask, Coinbase Wallet, etc.
- **WalletConnect**: 300+ mobile wallets including Trust Wallet, Rainbow, etc.

## Project Structure

```
src/
├── components/     # Reusable UI components
│   ├── DepositForm.jsx
│   ├── InheritanceManager.jsx
│   ├── Layout.jsx
│   └── Navigation.jsx
├── config/         # App configuration
│   └── wagmi.js    # Wagmi and RainbowKit setup
├── hooks/          # Custom React hooks
│   └── useInheritanceHistory.js
├── pages/          # Page components
│   ├── Home.jsx
│   ├── Deposit.jsx
│   ├── Manage.jsx
│   └── History.jsx
├── utils/          # Utility functions
│   ├── CryptoHeirABI.json
│   └── networkConfig.js
├── App.jsx         # Main app component
└── main.jsx        # Entry point
```

## Features

- **Create Inheritance**: Deposit ETH with a beneficiary and deadline
- **Manage Inheritances**: Claim, reclaim, or extend deadlines
- **History Tracking**: View all inheritances as depositor or beneficiary
- **Multi-Chain**: Seamlessly switch between supported networks
- **Wallet Integration**: Connect via MetaMask or WalletConnect

## Linting

Run ESLint:
```bash
npm run lint
```

## Learn More

- [wagmi Documentation](https://wagmi.sh)
- [RainbowKit Documentation](https://www.rainbowkit.com)
- [Viem Documentation](https://viem.sh)
- [Vite Documentation](https://vitejs.dev)
