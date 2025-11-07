import { NavLink } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function Navigation({ account, isConnected }) {
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

      <div className="navbar-end">
        <ConnectButton />
      </div>
    </div>
  );
}
