export function NetworkErrorScreen({ networkError, networkInfo }) {
  return (
    <div className="card bg-base-100 shadow-xl max-w-2xl mx-auto">
      <div className="card-body">
        <h2 className="card-title text-2xl text-error">Network Issue</h2>
        <div className="alert alert-error">
          <span>{networkError}</span>
        </div>
        {networkInfo && (
          <div className="stats shadow">
            <div className="stat">
              <div className="stat-title">Current Network</div>
              <div className="stat-value text-lg">{networkInfo.name}</div>
              <div className="stat-desc">Chain ID: {networkInfo.chainId}</div>
            </div>
          </div>
        )}
        <div className="alert alert-info">
          <div>
            <h3 className="font-bold mb-2">Supported Networks:</h3>
            <ul className="text-sm">
              <li>• Sepolia Testnet (Chain ID: 11155111)</li>
              <li>• Ethereum Mainnet (Chain ID: 1)</li>
              <li>• Polygon Mainnet (Chain ID: 137)</li>
              <li>• Polygon Mumbai Testnet (Chain ID: 80001)</li>
              <li>• BSC Mainnet (Chain ID: 56)</li>
              <li>• BSC Testnet (Chain ID: 97)</li>
            </ul>
            <p className="mt-3 font-semibold">Please switch your network in MetaMask to continue.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
