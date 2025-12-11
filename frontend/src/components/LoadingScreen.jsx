export function LoadingScreen() {
  return (
    <div className="hero min-h-[60vh]">
      <div className="hero-content">
        <div className="text-center glass-card p-12 rounded-3xl shadow-smooth-xl">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <h2 className="text-3xl font-bold mt-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Loading...
          </h2>
          <p className="text-base-content/70 mt-2 text-lg">Initializing contract...</p>
        </div>
      </div>
    </div>
  );
}
