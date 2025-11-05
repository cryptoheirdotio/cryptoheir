import { http, createConfig } from 'wagmi';
import { foundry, sepolia, mainnet } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// Get WalletConnect project ID from environment
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  console.warn('VITE_WALLETCONNECT_PROJECT_ID is not set. WalletConnect will not be available.');
}

// Define supported chains
export const chains = [foundry, sepolia, mainnet];

// Configure wagmi
export const config = createConfig({
  chains,
  connectors: [
    injected(), // MetaMask, Coinbase Wallet, etc.
    ...(projectId ? [walletConnect({ projectId })] : []), // Only add WalletConnect if project ID is available
  ],
  transports: {
    [foundry.id]: http('http://127.0.0.1:8545'), // Local Foundry node
    [sepolia.id]: http(), // Uses public RPC from viem
    [mainnet.id]: http(), // Uses public RPC from viem
  },
});
