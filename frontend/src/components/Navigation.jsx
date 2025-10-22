import { NavLink } from 'react-router-dom';

export function Navigation({ account, isConnected, connectWallet, disconnectWallet }) {
  return (
    <nav className="navigation">
      <div className="nav-brand">
        <h1>CryptoHeir</h1>
        <p className="nav-subtitle">Time-locked fund transfers</p>
      </div>

      <div className="nav-links">
        <NavLink
          to="/"
          className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
          end
        >
          Home
        </NavLink>
        {isConnected ? (
          <>
            <NavLink
              to="/deposit"
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            >
              Deposit
            </NavLink>
            <NavLink
              to="/manage"
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            >
              Manage
            </NavLink>
          </>
        ) : (
          <>
            <span className="nav-link disabled">
              Deposit
            </span>
            <span className="nav-link disabled">
              Manage
            </span>
          </>
        )}
      </div>

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
    </nav>
  );
}
