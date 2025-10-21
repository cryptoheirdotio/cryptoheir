import { useState, useEffect } from 'react';
import { useWeb3 } from './hooks/useWeb3';
import { DepositForm } from './components/DepositForm';
import { InheritanceManager } from './components/InheritanceManager';
import { getNetworkByChainId } from './utils/networkConfig';
import './App.css';

function App() {
  const { account, isConnected, connectWallet, disconnectWallet, initContract, contract, chainId } = useWeb3();
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
  }, [isConnected, chainId, initContract]);

  return (
    <div className="App">
      <header className="header">
        <h1>CryptoHeir</h1>
        <p className="subtitle">Time-locked fund transfers on blockchain</p>
        <div className="wallet-section">
          {!isConnected ? (
            <button className="connect-btn" onClick={connectWallet}>
              Connect Wallet
            </button>
          ) : (
            <div className="connected">
              <span className="account">
                {account?.slice(0, 6)}...{account?.slice(-4)}
              </span>
              <button className="disconnect-btn" onClick={disconnectWallet}>
                Disconnect
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="main">
        {!isConnected ? (
          <div className="card welcome">
            <h2>Welcome to CryptoHeir</h2>
            <p>Connect your wallet to get started.</p>
            <ul>
              <li>Deposit funds for a beneficiary with a deadline</li>
              <li>Beneficiaries can claim funds after the deadline</li>
              <li>Depositors can reclaim funds before the deadline</li>
              <li>Extend deadlines anytime before expiration</li>
            </ul>
          </div>
        ) : networkError ? (
          <div className="card error-card">
            <h2>Network Issue</h2>
            <p className="error-message">{networkError}</p>
            {networkInfo && (
              <div className="info-box">
                <p><strong>Current Network:</strong> {networkInfo.name}</p>
                <p><strong>Chain ID:</strong> {networkInfo.chainId}</p>
              </div>
            )}
            <div className="info-box">
              <p><strong>Supported Networks:</strong></p>
              <ul>
                <li>Sepolia Testnet (Chain ID: 11155111)</li>
                <li>Ethereum Mainnet (Chain ID: 1)</li>
                <li>Polygon Mainnet (Chain ID: 137)</li>
                <li>Polygon Mumbai Testnet (Chain ID: 80001)</li>
                <li>BSC Mainnet (Chain ID: 56)</li>
                <li>BSC Testnet (Chain ID: 97)</li>
              </ul>
              <p>Please switch your network in MetaMask to continue.</p>
            </div>
          </div>
        ) : contract ? (
          <div className="content">
            <div className="info-banner">
              <strong>Network:</strong> {networkInfo?.name} |
              <strong> Contract:</strong> {contractAddress?.slice(0, 10)}...{contractAddress?.slice(-8)}
            </div>
            <div className="grid">
              <DepositForm contract={contract} account={account} />
              <InheritanceManager contract={contract} account={account} />
            </div>
          </div>
        ) : (
          <div className="card">
            <h2>Loading...</h2>
            <p>Initializing contract...</p>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>Built with Foundry & React</p>
      </footer>
    </div>
  );
}

export default App;
