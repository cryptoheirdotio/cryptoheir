import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useWeb3 } from './hooks/useWeb3';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Deposit } from './pages/Deposit';
import { Manage } from './pages/Manage';
import { getNetworkByChainId } from './utils/networkConfig';

function App() {
  const { account, isConnected, connectWallet, disconnectWallet, initContract, contract, chainId, signer } = useWeb3();
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
      initContract(network.contractAddress);
    } else {
      setNetworkInfo(null);
      setContractAddress('');
      setNetworkError('');
    }
  }, [isConnected, chainId, signer]);

  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route
            element={
              <Layout
                account={account}
                isConnected={isConnected}
                connectWallet={connectWallet}
                disconnectWallet={disconnectWallet}
                networkError={networkError}
                networkInfo={networkInfo}
                contract={contract}
              />
            }
          >
            <Route path="/" element={<Home />} />
            <Route path="/deposit" element={<Deposit />} />
            <Route path="/manage" element={<Manage />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
