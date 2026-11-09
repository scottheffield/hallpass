import { useEffect, useState } from "react";
import { get } from "./lib/api";

interface Health {
  ok: boolean;
  model: string;
  configured: { claude: boolean; elastic: boolean };
}

// Skeleton screen. The UX shell slice replaces this with the real views.
export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    get<Health>("/api/health")
      .then(setHealth)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "API unavailable"));
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
      <p className="text-2xl">Why are you here?</p>
      <h1 className="text-5xl font-semibold tracking-tight">Hallpass</h1>
      <p className="opacity-80">Your pass to the conference you actually wanted.</p>

      <section aria-live="polite" className="text-sm opacity-70">
        {error && <p>API: {error}</p>}
        {health && (
          <p>
            API ok · Claude {health.configured.claude ? "configured" : "not configured"} · Elastic{" "}
            {health.configured.elastic ? "configured" : "not configured"}
          </p>
        )}
        {!health && !error && <p>Checking API…</p>}
      </section>
    </main>
  );
}
