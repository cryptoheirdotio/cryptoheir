// Pre-configured networks with contract addresses
export const NETWORKS = {
  foundryTestnet: {
    name: 'Foundry Testnet',
    chainId: 31337,
    contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Add your Foundry Testnet contract address here
    explorer: 'https://localhost',
  },
};

// Get network configuration by chain ID
export const getNetworkByChainId = (chainId) => {
  return Object.values(NETWORKS).find(network => network.chainId === chainId);
};

// Get network key by chain ID
export const getNetworkKeyByChainId = (chainId) => {
  return Object.keys(NETWORKS).find(key => NETWORKS[key].chainId === chainId);
};

// Check if contract address is configured for a network
export const hasContractAddress = (networkKey) => {
  return NETWORKS[networkKey] && NETWORKS[networkKey].contractAddress !== '';
};
