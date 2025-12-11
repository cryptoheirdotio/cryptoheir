export function WelcomeScreen() {
  return (
    <div className="hero min-h-[60vh] relative">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 rounded-3xl"></div>
      <div className="hero-content text-center relative z-10">
        <div className="max-w-3xl">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Welcome to CryptoHeir
          </h1>
          <div className="space-y-6">
            <p className="text-lg leading-relaxed opacity-90">
              CryptoHeir is a secure way to transfer cryptocurrency to your loved ones or beneficiaries on a schedule you control. Set up a time-locked transfer today, and your chosen recipient can claim the funds after your specified deadline passes.
            </p>
            <p className="text-lg leading-relaxed opacity-90">
              Whether you're planning for inheritance, creating a trust fund, or scheduling a future payment, CryptoHeir makes it simple and secure. No intermediaries, no complex paperwork—just connect your wallet and get started.
            </p>
            <div className="pt-4">
              <p className="text-xl font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Connect your wallet to get started
              </p>
              <p className="text-sm mt-2 opacity-70">Click the button in the top right corner</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
