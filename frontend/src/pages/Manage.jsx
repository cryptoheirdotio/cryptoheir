import { useOutletContext, useSearchParams } from 'react-router-dom';
import { InheritanceManager } from '../components/InheritanceManager';

export function Manage() {
  const { contract, account, networkInfo } = useOutletContext();
  const [searchParams] = useSearchParams();
  const idFromUrl = searchParams.get('id');

  return (
    <>
      <div className="alert alert-info mb-6">
        <div>
          <strong>Network:</strong> {networkInfo.name} | <strong>Contract:</strong> {contract.target.slice(0, 10)}...{contract.target.slice(-8)}
        </div>
      </div>
      <InheritanceManager account={account} initialId={idFromUrl} />
    </>
  );
}
