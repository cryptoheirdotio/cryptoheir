import { useOutletContext } from 'react-router-dom';
import { DepositForm } from '../components/DepositForm';

export function Deposit() {
  const { contract, account, networkInfo } = useOutletContext();

  return (
    <div className="page-content">
      <div className="info-banner">
        <strong>Network:</strong> {networkInfo.name} |
        <strong> Contract:</strong> {contract.target.slice(0, 10)}...{contract.target.slice(-8)}
      </div>
      <div className="single-form-container">
        <DepositForm contract={contract} account={account} />
      </div>
    </div>
  );
}
