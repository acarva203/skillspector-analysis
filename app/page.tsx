import { Shield } from "lucide-react"
import { Scanner } from "@/components/scanner"

const DIMENSIONS = [
  { title: "Maintenance", desc: "Age, activity, releases, and contributor count." },
  { title: "Supply chain", desc: "Pinned deps, lockfiles, install scripts, remote fetches." },
  { title: "Security hygiene", desc: "CI, CodeQL, Dependabot, security policy, tests." },
  { title: "Engineering quality", desc: "Docs, tests, changelog, community adoption." },
  { title: "Permission safety", desc: "Shell, filesystem, network, and secrets access." },
  { title: "Transparency", desc: "License, provenance, and absence of obfuscation." },
]

const CATEGORIES = [
  "Prompt Injection",
  "Anti-Refusal",
  "Data Exfiltration",
  "Privilege Escalation",
  "Supply Chain",
  "Excessive Agency",
  "Output Handling",
  "System Prompt Leakage",
  "Memory Poisoning",
  "Tool Misuse",
  "Rogue Agent",
  "Trigger Abuse",
  "Behavioral AST",
  "Taint Tracking",
  "YARA Signatures",
  "MCP Least Privilege",
  "MCP Tool Poisoning",
]

export default function Page() {
  return (
    <main className="min-h-dvh">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
              SkillSpector
            </span>
          </div>
          <a
            href="https://github.com/NVIDIA/SkillSpector"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Engine by NVIDIA ↗
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
        <section className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-safe" />
            Static analysis · 67 patterns · 17 categories
          </span>
          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            How much can you trust this repository?
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty leading-relaxed text-muted-foreground">
            Scanners are a trust signal, not a guarantee. Paste a public GitHub repo and SkillSpector
            weighs maintenance, provenance, supply-chain and permission signals — alongside 64
            vulnerability patterns — into an explainable trust score with a separate confidence level.
          </p>
        </section>

        <div className="mt-12">
          <Scanner />
        </div>

        <section className="mt-24">
          <h2 className="text-center text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Trust dimensions
          </h2>
          <ul className="mx-auto mt-6 grid max-w-3xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DIMENSIONS.map((d) => (
              <li key={d.title} className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm font-medium text-foreground">{d.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{d.desc}</p>
              </li>
            ))}
          </ul>

          <h2 className="mt-16 text-center text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Vulnerability patterns
          </h2>
          <ul className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2">
            {CATEGORIES.map((c) => (
              <li
                key={c}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"
              >
                {c}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-4 py-6 text-center text-xs text-muted-foreground">
          Static-analysis port of{" "}
          <a
            href="https://github.com/NVIDIA/SkillSpector"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline-offset-4 hover:underline"
          >
            NVIDIA/SkillSpector
          </a>
. Inspired by Trail of Bits&apos; observation that repository scanning is a trust signal, not a
          guarantee — findings are heuristic and evidence-based, so always review skills before
          installing.
        </div>
      </footer>
    </main>
  )
}
