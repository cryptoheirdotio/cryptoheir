import { useMemo } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAccount, useChainId } from 'wagmi';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Deposit } from './pages/Deposit';
import { Manage } from './pages/Manage';
import { History } from './pages/History';
import { getNetworkByChainId } from './utils/networkConfig';

function App() {
  // Wagmi hooks for wallet connection state
  const { address: account, isConnected } = useAccount();
  const chainId = useChainId();

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

  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route
            element={
              <Layout
                account={account}
                isConnected={isConnected}
                networkError={networkError}
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
