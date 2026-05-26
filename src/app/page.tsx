import Link from "next/link";

export default function LandingPage() {
  // In production with auth:
  // const session = await auth();
  // if (session) redirect("/");
  // For now, this is a simple landing page.

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      {/* Nav */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            OC
          </div>
          <span className="text-lg font-semibold">OpenClay</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/tables/demo"
            className="rounded-md px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            Sign In
          </Link>
          <Link
            href="/tables/demo"
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Open Source
        </div>

        <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight text-zinc-50">
          Enrich your data.
          <br />
          <span className="text-indigo-400">Close more deals.</span>
        </h1>

        <p className="mt-6 max-w-lg text-lg text-zinc-400">
          The open-source data enrichment platform. Waterfall enrichment, AI
          agents, and spreadsheet-native workflows for modern sales teams.
        </p>

        <div className="mt-10 flex gap-3">
          <Link
            href="/tables/demo"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Get Started Free
            <svg
              className="size-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
          <a
            href="https://github.com/openclay/openclay"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
            </svg>
            View on GitHub
          </a>
        </div>

        {/* Features */}
        <div className="mt-24 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
          <FeatureCard
            title="Waterfall Enrichment"
            description="Chain multiple data providers. First match wins. Maximize coverage, minimize cost."
          />
          <FeatureCard
            title="AI Agents"
            description="Use GPT-4, Claude, or Gemini to research, summarize, and score your leads automatically."
          />
          <FeatureCard
            title="Spreadsheet Native"
            description="A familiar spreadsheet interface with formulas, filters, sorts, and real-time collaboration."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-6 text-center text-xs text-zinc-500">
        OpenClay is open-source software. Built with Next.js, TanStack Query,
        and Glide Data Grid.
      </footer>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 text-left">
      <h3 className="mb-2 text-sm font-semibold text-zinc-200">{title}</h3>
      <p className="text-xs leading-relaxed text-zinc-400">{description}</p>
    </div>
  );
}
