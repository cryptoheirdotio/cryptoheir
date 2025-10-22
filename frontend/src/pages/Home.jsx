import { useOutletContext } from 'react-router-dom';
import { DepositForm } from '../components/DepositForm';
import { InheritanceManager } from '../components/InheritanceManager';

export function Home() {
  const { contract, account, networkInfo } = useOutletContext();

  return (
    <div className="page-content">
      <div className="info-banner">
        <strong>Network:</strong> {networkInfo.name} |
        <strong> Contract:</strong> {contract.target.slice(0, 10)}...{contract.target.slice(-8)}
      </div>
      <div className="grid">
        <DepositForm contract={contract} account={account} />
        <InheritanceManager contract={contract} account={account} />
      </div>
    </div>
  );
}
