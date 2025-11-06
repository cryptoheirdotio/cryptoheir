import { useState, useEffect } from 'react';
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

  const [contractAddress, setContractAddress] = useState('');
  const [networkInfo, setNetworkInfo] = useState(null);
  const [networkError, setNetworkError] = useState('');

  // Auto-detect network and set contract address when wallet is connected
  useEffect(() => {
    if (isConnected && chainId) {
      const network = getNetworkByChainId(Number(chainId));

      if (!network) {
        setNetworkError(`Unsupported network (Chain ID: ${chainId}). Please switch to a supported network.`);
        setNetworkInfo(null);
        setContractAddress('');
        return;
      }

      if (!network.contractAddress) {
        setNetworkError(`Contract not deployed on ${network.name}. Please configure the contract address.`);
        setNetworkInfo(network);
        setContractAddress('');
        return;
      }

      setNetworkError('');
      setNetworkInfo(network);
      setContractAddress(network.contractAddress);
    } else {
      setNetworkInfo(null);
      setContractAddress('');
      setNetworkError('');
    }
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
