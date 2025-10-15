import { useState } from 'react';
import { useWeb3 } from './hooks/useWeb3';
import { DepositForm } from './components/DepositForm';
import { InheritanceManager } from './components/InheritanceManager';
import './App.css';

function App() {
  const { account, isConnected, connectWallet, disconnectWallet, initContract, contract } = useWeb3();
  const [contractAddress, setContractAddress] = useState('');
  const [tempAddress, setTempAddress] = useState('');

  const handleSetContract = () => {
    if (tempAddress) {
      setContractAddress(tempAddress);
      initContract(tempAddress);
    }
  };

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
        ) : !contract ? (
          <div className="card contract-setup">
            <h2>Set Contract Address</h2>
            <p>Enter the deployed CryptoHeir contract address:</p>
            <div className="form-group">
              <input
                type="text"
                value={tempAddress}
                onChange={(e) => setTempAddress(e.target.value)}
                placeholder="0x..."
              />
              <button onClick={handleSetContract}>Set Contract</button>
            </div>
            <div className="info-box">
              <p><strong>Note:</strong> You need to deploy the contract first or use an existing deployment.</p>
              <p>To deploy locally:</p>
              <pre>cd foundry && forge script script/Deploy.s.sol --rpc-url &lt;YOUR_RPC_URL&gt; --broadcast</pre>
            </div>
          </div>
        ) : (
          <div className="content">
            <div className="info-banner">
              <strong>Contract:</strong> {contractAddress?.slice(0, 10)}...{contractAddress?.slice(-8)}
            </div>
            <div className="grid">
              <DepositForm contract={contract} account={account} />
              <InheritanceManager contract={contract} account={account} />
            </div>
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
