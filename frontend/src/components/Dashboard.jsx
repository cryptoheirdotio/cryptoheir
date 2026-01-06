import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/dashboard-data.json');
        if (!response.ok) {
          throw new Error('Dashboard data not found. Please run "npm run fetch-dashboard" to generate it.');
        }
        const jsonData = await response.json();
        setData(jsonData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-warning">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <h3 className="font-bold">Dashboard Data Not Available</h3>
          <div className="text-sm">{error}</div>
          <div className="text-sm mt-2">Run the following command to generate dashboard data:</div>
          <code className="bg-base-200 px-2 py-1 rounded mt-1 inline-block">npm run fetch-dashboard</code>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { global, networks, tokens, lastUpdated, updateDuration } = data;

  // Calculate time ago
  const lastUpdateTime = new Date(lastUpdated);
  const timeAgo = formatTimeAgo(lastUpdateTime);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-sm opacity-70 mt-1">
            Ecosystem-wide statistics across all networks
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs opacity-70">Last updated</div>
          <div className="font-medium">{timeAgo}</div>
          <div className="text-xs opacity-50 mt-1">
            (took {(updateDuration / 1000).toFixed(1)}s)
          </div>
        </div>
      </div>

      {/* Global Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Inheritances"
          value={global.totalInheritances}
          icon="📦"
          color="primary"
        />
        <StatCard
          title="Active"
          value={global.totalActive}
          icon="⏳"
          color="info"
        />
        <StatCard
          title="Claimed"
          value={global.totalClaimed}
          icon="✅"
          color="success"
        />
        <StatCard
          title="Reclaimed"
          value={global.totalReclaimed}
          icon="↩️"
          color="warning"
        />
      </div>

      {/* Networks Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Networks</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(networks).map((network) => (
            <NetworkCard key={network.contractAddress} network={network} />
          ))}
        </div>
      </div>

      {/* Tokens Section */}
      {tokens && tokens.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Token Distribution</h2>
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Network</th>
                  <th className="text-right">Count</th>
                  <th className="text-right">Total Amount</th>
                  <th className="text-right">Active</th>
                  <th className="text-right">Claimed</th>
                  <th className="text-right">Reclaimed</th>
                </tr>
              </thead>
              <tbody>
                {tokens
                  .sort((a, b) => b.count - a.count)
                  .map((token, index) => (
                    <tr key={`${token.symbol}-${token.chainId}-${index}`}>
                      <td>
                        <div className="font-bold">{token.symbol}</div>
                        <div className="text-xs opacity-50 font-mono">
                          {token.address.slice(0, 6)}...{token.address.slice(-4)}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-sm badge-outline">
                          {token.network}
                        </span>
                      </td>
                      <td className="text-right font-medium">{token.count}</td>
                      <td className="text-right font-mono">{parseFloat(token.totalAmount).toFixed(4)}</td>
                      <td className="text-right">{token.active}</td>
                      <td className="text-right text-success">{token.claimed}</td>
                      <td className="text-right text-warning">{token.reclaimed}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title">Quick Actions</h2>
          <div className="flex flex-wrap gap-2">
            <Link to="/deposit" className="btn btn-primary btn-sm">
              Create Inheritance
            </Link>
            <Link to="/manage" className="btn btn-secondary btn-sm">
              Manage Inheritances
            </Link>
            <Link to="/history" className="btn btn-accent btn-sm">
              View History
            </Link>
          </div>
          <div className="text-xs opacity-70 mt-4">
            To update dashboard data, run: <code className="bg-base-300 px-2 py-0.5 rounded">npm run fetch-dashboard</code>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper component for stat cards
function StatCard({ title, value, icon, color }) {
  return (
    <div className={`card bg-${color}/10 border border-${color}/20`}>
      <div className="card-body">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm opacity-70 font-medium">{title}</div>
            <div className={`text-3xl font-bold text-${color} mt-1`}>{value}</div>
          </div>
          <div className="text-3xl">{icon}</div>
        </div>
      </div>
    </div>
  );
}

// Helper component for network cards
function NetworkCard({ network }) {
  const totalInheritances = network.totalInheritances;
  const hasData = totalInheritances > 0;

  return (
    <div className="card bg-base-200 border border-base-300">
      <div className="card-body">
        <h3 className="card-title text-lg">{network.name}</h3>
        <div className="text-xs font-mono opacity-50 mb-3">
          {network.contractAddress.slice(0, 10)}...{network.contractAddress.slice(-8)}
        </div>

        {hasData ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="opacity-70">Total</span>
              <span className="font-bold">{network.totalInheritances}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="opacity-70">Active</span>
              <span className="font-medium text-info">{network.totalActive}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="opacity-70">Claimed</span>
              <span className="font-medium text-success">{network.totalClaimed}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="opacity-70">Reclaimed</span>
              <span className="font-medium text-warning">{network.totalReclaimed}</span>
            </div>

            {/* Token breakdown */}
            {network.tokenStats && network.tokenStats.length > 0 && (
              <div className="pt-2 border-t border-base-300">
                <div className="text-xs opacity-70 mb-1">Tokens</div>
                {network.tokenStats.map((token, index) => (
                  <div key={index} className="flex justify-between text-xs">
                    <span className="font-mono">{token.symbol}</span>
                    <span className="opacity-70">{token.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm opacity-50 text-center py-4">
            No inheritances yet
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to format time ago
function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;

  const months = Math.floor(days / 30);
  return `${months} month${months !== 1 ? 's' : ''} ago`;
}
