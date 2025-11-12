import { useOutletContext } from 'react-router-dom';
import { DepositForm } from '../components/DepositForm';
import { InheritanceManager } from '../components/InheritanceManager';

export function Home() {
  const { contract, account, networkInfo } = useOutletContext();

  return (
    <>
      <div className="alert alert-info mb-6">
        <div>
          <strong>Network:</strong> {networkInfo.name} | <strong>Contract:</strong> {contract.target.slice(0, 10)}...{contract.target.slice(-8)}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DepositForm account={account} />
        <InheritanceManager account={account} />
      </div>
    </>
  );
}
