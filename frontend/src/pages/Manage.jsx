import { useOutletContext, useSearchParams } from 'react-router-dom';
import { InheritanceManager } from '../components/InheritanceManager';

export function Manage() {
  const { contractAddress, account, networkInfo } = useOutletContext();
  const [searchParams] = useSearchParams();
  const idFromUrl = searchParams.get('id');

  return (
    <>
      <div className="alert alert-info shadow-smooth mb-8 border-l-4 border-info">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <div className="font-medium">
          <strong>Network:</strong> {networkInfo.name} | <strong>Contract:</strong> <span className="font-mono">{contractAddress.slice(0, 10)}...{contractAddress.slice(-8)}</span>
        </div>
      </div>
      <InheritanceManager account={account} initialId={idFromUrl} />
    </>
  );
}
