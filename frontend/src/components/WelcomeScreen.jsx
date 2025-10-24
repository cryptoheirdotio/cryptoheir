export function WelcomeScreen() {
  return (
    <div className="hero min-h-[60vh]">
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="text-5xl font-bold">Welcome to CryptoHeir</h1>
          <p className="py-6 text-lg">Connect your wallet to get started.</p>
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Features</h2>
              <ul className="menu menu-vertical text-left">
                <li>
                  <span className="badge badge-primary mr-2">1</span>
                  Deposit funds for a beneficiary with a deadline
                </li>
                <li>
                  <span className="badge badge-primary mr-2">2</span>
                  Beneficiaries can claim funds after the deadline
                </li>
                <li>
                  <span className="badge badge-primary mr-2">3</span>
                  Depositors can reclaim funds before the deadline
                </li>
                <li>
                  <span className="badge badge-primary mr-2">4</span>
                  Extend deadlines anytime before expiration
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
