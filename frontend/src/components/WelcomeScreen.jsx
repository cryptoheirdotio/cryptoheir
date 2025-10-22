export function WelcomeScreen() {
  return (
    <div className="card welcome">
      <h2>Welcome to CryptoHeir</h2>
      <p>Connect your wallet to get started.</p>
      <ul>
        <li>Deposit funds for a beneficiary with a deadline</li>
        <li>Beneficiaries can claim funds after the deadline</li>
        <li>Depositors can reclaim funds before the deadline</li>
        <li>Extend deadlines anytime before expiration</li>
      </ul>
    </div>
  );
}
