import { useOutletContext, useSearchParams } from 'react-router-dom';
import { InheritanceManager } from '../components/InheritanceManager';

export function Manage() {
  const { contractAddress, account, networkInfo } = useOutletContext();
  const [searchParams] = useSearchParams();
  const idFromUrl = searchParams.get('id');

  return (
    <>
      <div className="alert alert-info mb-6">
        <div>
          <strong>Network:</strong> {networkInfo.name} | <strong>Contract:</strong> {contractAddress.slice(0, 10)}...{contractAddress.slice(-8)}
        </div>
      </div>
      <InheritanceManager account={account} initialId={idFromUrl} />
    </>
  );
}
