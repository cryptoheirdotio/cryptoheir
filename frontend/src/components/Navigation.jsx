import { NavLink } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import ThemeToggle from './ThemeToggle';

export function Navigation({ isConnected }) {
  return (
    <div className="glass-navbar sticky top-0 z-50 shadow-smooth-lg">
      <div className="navbar container mx-auto">
        <div className="navbar-start">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              CryptoHeir
            </h1>
            <p className="text-xs opacity-70 font-medium">Time-locked fund transfers</p>
          </div>
        </div>

        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1 gap-1">
            <li>
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `font-medium transition-all ${isActive ? 'active' : 'hover:bg-base-200'}`
                }
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
                    className={({ isActive }) =>
                      `font-medium transition-all ${isActive ? 'active' : 'hover:bg-base-200'}`
                    }
                  >
                    Deposit
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/manage"
                    className={({ isActive }) =>
                      `font-medium transition-all ${isActive ? 'active' : 'hover:bg-base-200'}`
                    }
                  >
                    Manage
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/history"
                    className={({ isActive }) =>
                      `font-medium transition-all ${isActive ? 'active' : 'hover:bg-base-200'}`
                    }
                  >
                    History
                  </NavLink>
                </li>
              </>
            ) : (
              <>
                <li className="disabled">
                  <span className="opacity-50 cursor-not-allowed font-medium">Deposit</span>
                </li>
                <li className="disabled">
                  <span className="opacity-50 cursor-not-allowed font-medium">Manage</span>
                </li>
                <li className="disabled">
                  <span className="opacity-50 cursor-not-allowed font-medium">History</span>
                </li>
              </>
            )}
          </ul>
        </div>

        <div className="navbar-end gap-2">
          <ThemeToggle />
          <ConnectButton />
        </div>
      </div>
    </div>
  );
}
