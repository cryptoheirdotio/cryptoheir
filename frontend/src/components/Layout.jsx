import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { Navigation } from './Navigation';
import { WelcomeScreen } from './WelcomeScreen';
import { NetworkErrorScreen } from './NetworkErrorScreen';
import { LoadingScreen } from './LoadingScreen';

export function Layout({
  account,
  isConnected,
  networkError,
  networkInfo,
  contractAddress
}) {
  const location = useLocation();
  const protectedPaths = ['/deposit', '/manage', '/history'];
  const isProtectedPath = protectedPaths.includes(location.pathname);

  // Redirect to home if trying to access protected routes without wallet connection
  if (!isConnected && isProtectedPath) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-base-100 via-base-200 to-base-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navigation
        account={account}
        isConnected={isConnected}
      />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {!isConnected ? (
          <WelcomeScreen />
        ) : networkError ? (
          <NetworkErrorScreen networkError={networkError} networkInfo={networkInfo} />
        ) : !contractAddress ? (
          <LoadingScreen />
        ) : (
          <Outlet context={{ contractAddress, account, networkInfo }} />
        )}
      </main>
      <footer className="footer footer-center p-6 bg-base-200/50 dark:bg-gray-800/50 backdrop-blur-sm text-base-content border-t border-base-300 dark:border-gray-700">
        <div>
          <p className="font-medium">
            Built with <span className="text-primary">Foundry</span> & <span className="text-secondary">React</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
