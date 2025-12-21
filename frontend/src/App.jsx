import { useMemo, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAccount, useChainId, usePublicClient } from 'wagmi';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Deposit } from './pages/Deposit';
import { Manage } from './pages/Manage';
import { History } from './pages/History';
import { getNetworkByChainId } from './utils/networkConfig';
import { verifyContractExists } from './utils/contractVerification';

function App() {
  // Wagmi hooks for wallet connection state
  const { address: account, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();

  // State for contract verification
  const [verificationError, setVerificationError] = useState('');

  // Derive network information and contract address from chain ID
  const { contractAddress, networkInfo, networkError } = useMemo(() => {
    if (!isConnected || !chainId) {
      return {
        contractAddress: '',
        networkInfo: null,
        networkError: ''
      };
    }

    const network = getNetworkByChainId(Number(chainId));

    if (!network) {
      return {
        contractAddress: '',
        networkInfo: null,
        networkError: `Unsupported network (Chain ID: ${chainId}). Please switch to a supported network.`
      };
    }

    if (!network.contractAddress) {
      return {
        contractAddress: '',
        networkInfo: network,
        networkError: `Contract not deployed on ${network.name}. Please configure the contract address.`
      };
    }

    return {
      contractAddress: network.contractAddress,
      networkInfo: network,
      networkError: ''
    };
  }, [isConnected, chainId]);

  // Verify contract exists at the configured address
  useEffect(() => {
    const verifyContract = async () => {
      // Reset verification state
      setVerificationError('');

      // Skip verification if no contract address or network error
      if (!contractAddress || networkError) {
        return;
      }

      // Skip if public client not available
      if (!publicClient) {
        return;
      }

      try {
        const { exists, error } = await verifyContractExists(contractAddress, publicClient);

        if (!exists) {
          setVerificationError(error || 'No contract found at configured address');
        } else {
          setVerificationError('');
        }
      } catch (err) {
        console.error('Contract verification error:', err);
        setVerificationError(`Failed to verify contract: ${err.message}`);
      }
    };

    verifyContract();
  }, [contractAddress, networkError, publicClient]);

  // Combine network error and verification error
  const finalNetworkError = networkError || verificationError;

  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route
            element={
              <Layout
                account={account}
                isConnected={isConnected}
                networkError={finalNetworkError}
                networkInfo={networkInfo}
                contractAddress={contractAddress}
              />
            }
          >
            <Route path="/" element={<Home />} />
            <Route path="/deposit" element={<Deposit />} />
            <Route path="/manage" element={<Manage />} />
            <Route path="/history" element={<History />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
