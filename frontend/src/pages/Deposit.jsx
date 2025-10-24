import { useOutletContext } from 'react-router-dom';
import { DepositForm } from '../components/DepositForm';

export function Deposit() {
  const { contract, account, networkInfo } = useOutletContext();

  return (
    <>
      <div className="alert alert-info mb-6">
        <div>
          <strong>Network:</strong> {networkInfo.name} | <strong>Contract:</strong> {contract.target.slice(0, 10)}...{contract.target.slice(-8)}
        </div>
      </div>
      <div className="max-w-2xl mx-auto">
        <DepositForm contract={contract} account={account} />
      </div>
    </>
  );
}
