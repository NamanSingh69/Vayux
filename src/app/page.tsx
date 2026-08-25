export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white p-6">
      <div className="max-w-md w-full rounded-xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-2xl backdrop-blur-sm">
        <h1 className="text-2xl font-bold tracking-tight text-emerald-400">
          VayuX
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Bleh :p
        </p>
        <div className="mt-6 flex gap-3">
          <button className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400 transition">
            hihi
          </button>
        </div>
      </div>
    </main>
  );
}