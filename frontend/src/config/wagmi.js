import { http } from 'wagmi';
import { foundry, sepolia, mainnet } from 'wagmi/chains';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

// Get WalletConnect project ID from environment
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';

if (!projectId) {
  console.warn('VITE_WALLETCONNECT_PROJECT_ID is not set. Some wallet features may be limited.');
}

// Define supported chains - include Foundry only in development
const isDevelopment = import.meta.env.DEV;
export const chains = isDevelopment
  ? [foundry, sepolia, mainnet]
  : [mainnet];

// Configure transports - include Foundry only in development
const transports = isDevelopment
  ? {
      [foundry.id]: http('http://127.0.0.1:8545'), // Local Foundry node
      [sepolia.id]: http(), // Uses public RPC from viem
      [mainnet.id]: http(), // Uses public RPC from viem
    }
  : {
      [mainnet.id]: http(), // Uses public RPC from viem
    };

// Configure wagmi with RainbowKit's default wallets
export const config = getDefaultConfig({
  appName: 'CryptoHeir',
  projectId,
  chains,
  transports,
});
