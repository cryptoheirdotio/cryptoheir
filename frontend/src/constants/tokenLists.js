// Token lists for different networks
// Supported networks: Mainnet (1), Sepolia (11155111), Foundry Local (31337)

export const TOKEN_LISTS = {
  // Ethereum Mainnet (Chain ID: 1)
  1: [
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      decimals: 6,
      logo: '/tokens/usdc.svg'
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      decimals: 6,
      logo: '/tokens/usdt.svg'
    },
    {
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      decimals: 18,
      logo: '/tokens/dai.svg'
    },
    {
      symbol: 'WETH',
      name: 'Wrapped Ether',
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      decimals: 18,
      logo: '/tokens/weth.svg'
    }
  ],

  // Sepolia Testnet (Chain ID: 11155111)
  11155111: [
    {
      symbol: 'USDC',
      name: 'USD Coin (Testnet)',
      address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      decimals: 6,
      logo: '/tokens/usdc.svg'
    },
    {
      symbol: 'USDT',
      name: 'Tether USD (Testnet)',
      address: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06',
      decimals: 6,
      logo: '/tokens/usdt.svg'
    },
    {
      symbol: 'DAI',
      name: 'Dai Stablecoin (Testnet)',
      address: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357',
      decimals: 18,
      logo: '/tokens/dai.svg'
    },
    {
      symbol: 'WETH',
      name: 'Wrapped Ether (Testnet)',
      address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
      decimals: 18,
      logo: '/tokens/weth.svg'
    }
  ],

  // Foundry Local Testnet (Chain ID: 31337)
  31337: [
    {
      symbol: 'USDC',
      name: 'USD Coin (Local)',
      address: '0x0000000000000000000000000000000000000001',
      decimals: 6,
      logo: '/tokens/usdc.svg'
    },
    {
      symbol: 'USDT',
      name: 'Tether USD (Local)',
      address: '0x0000000000000000000000000000000000000002',
      decimals: 6,
      logo: '/tokens/usdt.svg'
    },
    {
      symbol: 'DAI',
      name: 'Dai Stablecoin (Local)',
      address: '0x0000000000000000000000000000000000000003',
      decimals: 18,
      logo: '/tokens/dai.svg'
    },
    {
      symbol: 'WETH',
      name: 'Wrapped Ether (Local)',
      address: '0x0000000000000000000000000000000000000004',
      decimals: 18,
      logo: '/tokens/weth.svg'
    }
  ]
};

/**
 * Get available tokens for a specific chain ID
 * @param {number} chainId - The blockchain network chain ID
 * @returns {Array} Array of token objects or empty array if network not supported
 */
export const getTokensForNetwork = (chainId) => {
  return TOKEN_LISTS[chainId] || [];
};

/**
 * Get a specific token by address on a given network
 * @param {number} chainId - The blockchain network chain ID
 * @param {string} tokenAddress - The token contract address
 * @returns {Object|null} Token object or null if not found
 */
export const getTokenByAddress = (chainId, tokenAddress) => {
  const tokens = getTokensForNetwork(chainId);
  return tokens.find(
    token => token.address.toLowerCase() === tokenAddress.toLowerCase()
  ) || null;
};

/**
 * Get a specific token by symbol on a given network
 * @param {number} chainId - The blockchain network chain ID
 * @param {string} symbol - The token symbol (e.g., 'USDC')
 * @returns {Object|null} Token object or null if not found
 */
export const getTokenBySymbol = (chainId, symbol) => {
  const tokens = getTokensForNetwork(chainId);
  return tokens.find(
    token => token.symbol.toLowerCase() === symbol.toLowerCase()
  ) || null;
};
