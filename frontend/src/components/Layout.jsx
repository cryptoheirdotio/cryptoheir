import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { Navigation } from './Navigation';
import { WelcomeScreen } from './WelcomeScreen';
import { NetworkErrorScreen } from './NetworkErrorScreen';
import { LoadingScreen } from './LoadingScreen';

export function Layout({
  account,
  isConnected,
  connectWallet,
  disconnectWallet,
  networkError,
  networkInfo,
  contract
}) {
  const location = useLocation();
  const protectedPaths = ['/deposit', '/manage'];
  const isProtectedPath = protectedPaths.includes(location.pathname);

  // Redirect to home if trying to access protected routes without wallet connection
  if (!isConnected && isProtectedPath) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation
        account={account}
        isConnected={isConnected}
        connectWallet={connectWallet}
        disconnectWallet={disconnectWallet}
      />
      <main className="flex-1 container mx-auto px-4 py-8">
        {!isConnected ? (
          <WelcomeScreen />
        ) : networkError ? (
          <NetworkErrorScreen networkError={networkError} networkInfo={networkInfo} />
        ) : !contract ? (
          <LoadingScreen />
        ) : (
          <Outlet context={{ contract, account, networkInfo }} />
        )}
      </main>
      <footer className="footer footer-center p-4 bg-base-300 text-base-content">
        <div>
          <p>Built with Foundry & React</p>
        </div>
      </footer>
    </div>
  );
}
