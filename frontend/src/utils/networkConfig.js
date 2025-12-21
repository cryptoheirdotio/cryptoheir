// Pre-configured networks with contract addresses
export const NETWORKS = {
  foundryTestnet: {
    name: 'Foundry Local Testnet',
    chainId: 31337,
    contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    explorer: 'http://localhost', // No blockchain explorer for local testnet
  },
  sepolia: {
    name: 'Sepolia Testnet',
    chainId: 11155111,
    contractAddress: '', // TODO: Add your deployed Sepolia contract address here
    explorer: 'https://sepolia.etherscan.io',
  },
  mainnet: {
    name: 'Ethereum Mainnet',
    chainId: 1,
    contractAddress: '', // TODO: Add your deployed Mainnet contract address here
    explorer: 'https://etherscan.io',
  },
};

// Get network configuration by chain ID
export const getNetworkByChainId = (chainId) => {
  return Object.values(NETWORKS).find(network => network.chainId === chainId);
};
