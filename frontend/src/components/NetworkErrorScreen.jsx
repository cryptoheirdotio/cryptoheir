export function NetworkErrorScreen({ networkError, networkInfo }) {
  return (
    <div className="glass-card shadow-smooth-xl max-w-3xl mx-auto rounded-2xl">
      <div className="card-body p-8">
        <h2 className="card-title text-3xl font-bold mb-4 text-error">
          Network Issue
        </h2>
        <div className="alert alert-error shadow-smooth">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">{networkError}</span>
        </div>
        {networkInfo && (
          <div className="stats shadow-smooth-lg w-full bg-base-100/50 dark:bg-gray-800/50 backdrop-blur mt-4">
            <div className="stat">
              <div className="stat-title font-semibold">Current Network</div>
              <div className="stat-value text-xl font-bold">{networkInfo.name}</div>
              <div className="stat-desc font-medium">Chain ID: {networkInfo.chainId}</div>
            </div>
          </div>
        )}
        <div className="alert alert-info shadow-smooth mt-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <h3 className="font-bold text-base mb-3">Supported Networks:</h3>
            <ul className="text-sm space-y-1 leading-relaxed">
              <li>• Sepolia Testnet (Chain ID: 11155111)</li>
              <li>• Ethereum Mainnet (Chain ID: 1)</li>
              <li>• Polygon Mainnet (Chain ID: 137)</li>
              <li>• Polygon Mumbai Testnet (Chain ID: 80001)</li>
              <li>• BSC Mainnet (Chain ID: 56)</li>
              <li>• BSC Testnet (Chain ID: 97)</li>
            </ul>
            <p className="mt-4 font-semibold text-base">
              Please switch your network in MetaMask to continue.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
