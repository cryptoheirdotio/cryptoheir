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
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              mounted,
            }) => {
              const ready = mounted;
              const connected = ready && account && chain;

              return (
                <div
                  {...(!ready && {
                    'aria-hidden': true,
                    style: {
                      opacity: 0,
                      pointerEvents: 'none',
                      userSelect: 'none',
                    },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <button onClick={openConnectModal} className="btn btn-primary btn-sm">
                          Connect Wallet
                        </button>
                      );
                    }

                    if (chain.unsupported) {
                      return (
                        <button onClick={openChainModal} className="btn btn-error btn-sm">
                          Wrong network
                        </button>
                      );
                    }

                    return (
                      <div className="flex gap-1.5">
                        <button
                          onClick={openChainModal}
                          className="btn btn-sm btn-outline gap-1.5 min-h-0 h-9 px-2.5"
                          type="button"
                        >
                          {chain.hasIcon && (
                            <div
                              className="w-4 h-4"
                              style={{
                                background: chain.iconBackground,
                                borderRadius: 999,
                                overflow: 'hidden',
                              }}
                            >
                              {chain.iconUrl && (
                                <img
                                  alt={chain.name ?? 'Chain icon'}
                                  src={chain.iconUrl}
                                  className="w-4 h-4"
                                />
                              )}
                            </div>
                          )}
                          <span className="text-xs font-medium">{chain.name}</span>
                        </button>

                        <button
                          onClick={openAccountModal}
                          className="btn btn-sm btn-outline gap-1.5 min-h-0 h-9 px-2.5"
                          type="button"
                        >
                          <span className="text-xs font-medium">
                            {account.displayBalance
                              ? ` ${account.displayBalance}`
                              : ''}
                          </span>
                          <span className="text-xs font-medium">{account.displayName}</span>
                          <svg
                            width="10"
                            height="6"
                            viewBox="0 0 10 6"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="opacity-70 flex-shrink-0"
                          >
                            <path
                              d="M1 1L5 5L9 1"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </div>
    </div>
  );
}
