export function LoadingScreen() {
  return (
    <div className="hero min-h-[60vh]">
      <div className="hero-content">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg"></span>
          <h2 className="text-2xl font-bold mt-4">Loading...</h2>
          <p className="text-base-content/70">Initializing contract...</p>
        </div>
      </div>
    </div>
  );
}
