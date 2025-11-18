export function WelcomeScreen() {
  return (
    <div className="hero min-h-[60vh]">
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="text-5xl font-bold">Welcome to CryptoHeir</h1>
          <p className="py-6 text-lg">
            CryptoHeir is a secure way to transfer cryptocurrency to your loved ones or beneficiaries on a schedule you control. Set up a time-locked transfer today, and your chosen recipient can claim the funds after your specified deadline passes.
          </p>
          <p className="pb-6 text-lg">
            Whether you're planning for inheritance, creating a trust fund, or scheduling a future payment, CryptoHeir makes it simple and secure. No intermediaries, no complex paperwork—just connect your wallet and get started.
          </p>
          <p className="text-lg font-semibold">Connect your wallet to get started.</p>
        </div>
      </div>
    </div>
  );
}
