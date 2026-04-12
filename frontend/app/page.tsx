export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-12">
        <section className="space-y-8 rounded-[2rem] border border-slate-800/70 bg-slate-900/80 p-10 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.9)] backdrop-blur-xl">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.4em] text-amber-300">DevVerse</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Minimal design, clear message.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-300">
              A simpler front page with fewer bells and whistles. Focus on clarity, typography, and a calm visual hierarchy.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-slate-800/70 bg-slate-950/80 p-6">
              <h2 className="text-lg font-semibold text-white">Clean layout</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Reduce distractions and make the core idea easy to scan on any device.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-800/70 bg-slate-950/80 p-6">
              <h2 className="text-lg font-semibold text-white">Calm palette</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Use subtle contrast and restrained accents to keep the page polished and readable.
              </p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-800/70 bg-slate-950/80 p-6">
            <h2 className="text-lg font-semibold text-white">What matters most</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-400">
              <li>• Simple typography and consistent spacing.</li>
              <li>• Minimal sections that communicate value clearly.</li>
              <li>• Clean call to action and focused content structure.</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
