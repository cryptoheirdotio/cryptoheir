export function NetworkErrorScreen({ networkError, networkInfo }) {
  return (
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
  );
}
