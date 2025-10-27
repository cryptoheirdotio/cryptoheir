import { NavLink } from 'react-router-dom';

export function Navigation({ account, isConnected, connectWallet, disconnectWallet }) {
  return (
    <div className="navbar bg-base-100 shadow-lg">
      <div className="navbar-start">
        <div>
          <h1 className="text-2xl font-bold">CryptoHeir</h1>
          <p className="text-xs opacity-70">Time-locked fund transfers</p>
        </div>
      </div>

      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
          <li>
            <NavLink
              to="/"
              className={({ isActive }) => isActive ? 'active' : ''}
              end
            >
              Home
            </NavLink>
          </li>
          {isConnected ? (
            <>
              <li>
                <NavLink
                  to="/deposit"
                  className={({ isActive }) => isActive ? 'active' : ''}
                >
                  Deposit
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/manage"
                  className={({ isActive }) => isActive ? 'active' : ''}
                >
                  Manage
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/history"
                  className={({ isActive }) => isActive ? 'active' : ''}
                >
                  History
                </NavLink>
              </li>
            </>
          ) : (
            <>
              <li className="disabled">
                <span className="opacity-50 cursor-not-allowed">Deposit</span>
              </li>
              <li className="disabled">
                <span className="opacity-50 cursor-not-allowed">Manage</span>
              </li>
              <li className="disabled">
                <span className="opacity-50 cursor-not-allowed">History</span>
              </li>
            </>
          )}
        </ul>
      </div>

      <div className="navbar-end gap-2">
        {!isConnected ? (
          <button className="btn btn-primary" onClick={connectWallet}>
            Connect Wallet
          </button>
        ) : (
          <>
            <div className="badge badge-outline">
              {account?.slice(0, 6)}...{account?.slice(-4)}
            </div>
            <button className="btn btn-outline btn-sm" onClick={disconnectWallet}>
              Disconnect
            </button>
          </>
        )}
      </div>
    </div>
  );
}
