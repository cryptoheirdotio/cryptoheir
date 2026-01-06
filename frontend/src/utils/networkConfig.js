// Pre-configured networks with contract addresses
export const NETWORKS = {
  foundryTestnet: {
    name: 'Foundry Local Testnet',
    chainId: 31337,
    contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    explorer: 'http://localhost', // No blockchain explorer for local testnet
    deploymentBlock: 0n, // Local testnet starts from block 0
  },
  sepolia: {
    name: 'Sepolia Testnet',
    chainId: 11155111,
    contractAddress: '', // TODO: Add your deployed Sepolia contract address here
    explorer: 'https://sepolia.etherscan.io',
    deploymentBlock: 0n, // TODO: Add deployment block when contract is deployed
  },
  mainnet: {
    name: 'Ethereum Mainnet',
    chainId: 1,
    contractAddress: '0xde106d79FA84098938eC28E020E928479faB4942',
    explorer: 'https://etherscan.io',
    deploymentBlock: 24166199n, // Contract deployed at block 24166199
  },
};

// Get network configuration by chain ID
export const getNetworkByChainId = (chainId) => {
  return Object.values(NETWORKS).find(network => network.chainId === chainId);
};
