import { Header } from "@/components/header"
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Waypoints,
} from "lucide-react"

export const metadata = {
  title: "Learn — SkillSpector",
  description:
    "A practical guide to AI agent skill security: how to evaluate a skill safely, how SkillSpector's scoring works, and further reading.",
}

const EVALUATION_STEPS = [
  {
    icon: ShieldCheck,
    title: "Start with the trust score",
    body: "A high trust score (70+) means the repo shows strong signals of being a legitimate, well-maintained project — not that it's vulnerability-free. Use it to triage: low-trust repos deserve deeper scrutiny regardless of the risk score.",
  },
  {
    icon: AlertTriangle,
    title: "Prioritise CRITICAL and HIGH findings",
    body: "A single CRITICAL finding (e.g. exec() or curl | bash) should block installation until you've read the exact code. HIGH findings like subprocess calls or env-variable harvesting are common in legitimate tools but warrant understanding why they exist.",
  },
  {
    icon: Waypoints,
    title: "Check the capability profile",
    body: "The capability bars show what share of code files exercise each permission — shell execution, filesystem access, network calls, secrets, destructive ops. The wider the blast radius a skill claims, the more reason to audit it before granting those permissions.",
  },
  {
    icon: BookOpen,
    title: "Read the maintenance signals",
    body: "A single-maintainer repo with no releases and no CI is higher-risk than a stale score alone suggests. Unmaintained skills won't receive security patches, and a bus-factor of one means the project could be abandoned or transferred to a malicious actor.",
  },
  {
    icon: ShieldAlert,
    title: "Treat false positives as part of the review",
    body: "Static regex scanners produce false positives. An exec() hit inside a docstring is not a real risk. The AI analysis panel (when available) classifies confirmed vs. false-positive findings — but always read the snippet yourself for anything CRITICAL.",
  },
]

const HOW_IT_WORKS_SECTIONS = [
  {
    title: "Stage 1 — Static pattern scan",
    body: "67 regex patterns across 17 risk categories run against every text file in the repo. Each pattern fires at most once per file, so a single vulnerable line doesn't inflate the count. The categories cover prompt injection, supply-chain attacks, data exfiltration, privilege escalation, excessive agency, MCP tool poisoning, and more. No LLM is involved at this stage — the scan is deterministic and fast.",
  },
  {
    title: "Risk scoring",
    body: "Each finding contributes severity points: CRITICAL = 50, HIGH = 25, MEDIUM = 10, LOW = 5. If any executable file exists in the repo, the raw total is multiplied by 1.3 — because a skill that actually runs code has a larger blast radius. The result is capped at 100. Thresholds: ≤ 20 = LOW / SAFE, ≤ 50 = MEDIUM / CAUTION, ≤ 80 = HIGH, > 80 = CRITICAL / DO NOT INSTALL.",
  },
  {
    title: "Trust assessment",
    body: "Separate from the risk score, the trust assessment weighs six dimensions of repository health: Maintenance (20%), Supply chain (20%), Security hygiene (20%), Engineering quality (15%), Permission safety (15%), and Transparency (10%). Each dimension has explainable evidence bullets. The confidence level (HIGH / MEDIUM / LOW) reflects how much evidence was available — a tiny repo with 3 files gets LOW confidence even if the trust score is high.",
  },
  {
    title: "Stage 2 — AI analysis (optional)",
    body: "After the scan loads, a second call sends all findings to an LLM (Gemini 2.0 Flash by default). It classifies each finding as confirmed or likely false-positive, and writes a short executive summary. This stage is optional: if no API key is configured the panel is silently hidden and the static results are unaffected.",
  },
  {
    title: "Dependency CVE lookup",
    body: "If the repo contains a requirements.txt or package.json, up to 60 dependencies are batched to the OSV.dev API to check for known CVEs. Vulnerable packages produce additional HIGH or CRITICAL findings that feed into the risk score.",
  },
]

const RESOURCES = [
  {
    title: "NVIDIA/SkillSpector",
    href: "https://github.com/NVIDIA/SkillSpector",
    desc: "The open-source engine this app ports to TypeScript. Stage 1 pattern definitions and the original Python implementation.",
  },
  {
    title: "Trail of Bits — MCP Security",
    href: "https://github.com/trailofbits/mcp-security",
    desc: "Trail of Bits' research and tooling on Model Context Protocol security, including threat modelling and attack taxonomy.",
  },
  {
    title: "Model Context Protocol specification",
    href: "https://modelcontextprotocol.io",
    desc: "The official MCP spec — useful for understanding what permissions and tool declarations a well-formed skill should include.",
  },
  {
    title: "OSV.dev — Open Source Vulnerability database",
    href: "https://osv.dev",
    desc: "The vulnerability database SkillSpector queries for CVEs in scanned dependencies. Covers PyPI, npm, Go, Maven, and more.",
  },
  {
    title: "OWASP Top 10 for LLM Applications",
    href: "https://owasp.org/www-project-top-10-for-large-language-model-applications/",
    desc: "The canonical reference for AI application security risks, including prompt injection, insecure output handling, and excessive agency.",
  },
]

export default function LearnPage() {
  return (
    <main className="min-h-dvh">
      <Header activePath="/learn" />

      <div className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
        {/* Hero */}
        <section className="mb-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Skill security guide
          </span>
          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            How to evaluate an AI agent skill
          </h1>
          <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
            A scanner is a trust signal, not a guarantee. This guide explains how to interpret
            SkillSpector's output, what the scores mean, and where to dig deeper.
          </p>
        </section>

        {/* Evaluation guide */}
        <section className="mb-20">
          <h2 className="mb-8 text-xl font-semibold text-foreground">
            Evaluating a skill safely
          </h2>
          <ol className="flex flex-col gap-6">
            {EVALUATION_STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card">
                  <span className="font-mono text-xs font-medium text-muted-foreground">
                    {i + 1}
                  </span>
                </div>
                <div className="pt-0.5">
                  <div className="mb-1.5 flex items-center gap-2">
                    <step.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                    <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* How it works */}
        <section className="mb-20">
          <h2 className="mb-8 text-xl font-semibold text-foreground">How SkillSpector works</h2>
          <div className="flex flex-col gap-4">
            {HOW_IT_WORKS_SECTIONS.map((s) => (
              <div key={s.title} className="rounded-xl border border-border bg-card p-5">
                <h3 className="mb-2 text-sm font-semibold text-foreground">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>

          {/* Score reference */}
          <div className="mt-6 overflow-hidden rounded-xl border border-border">
            <div className="border-b border-border bg-card px-5 py-3">
              <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Score thresholds
              </h3>
            </div>
            <div className="divide-y divide-border">
              {[
                { range: "0 – 20", level: "LOW", rec: "SAFE", color: "text-safe" },
                { range: "21 – 50", level: "MEDIUM", rec: "CAUTION", color: "text-caution" },
                { range: "51 – 80", level: "HIGH", rec: "DO NOT INSTALL", color: "text-danger" },
                { range: "81 – 100", level: "CRITICAL", rec: "DO NOT INSTALL", color: "text-danger" },
              ].map((row) => (
                <div
                  key={row.level}
                  className="grid grid-cols-3 gap-4 px-5 py-3 text-sm"
                >
                  <span className="font-mono text-muted-foreground">{row.range}</span>
                  <span className={`font-medium ${row.color}`}>{row.level}</span>
                  <span className="text-muted-foreground">{row.rec}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Resources */}
        <section>
          <h2 className="mb-8 text-xl font-semibold text-foreground">Further reading</h2>
          <ul className="flex flex-col gap-3">
            {RESOURCES.map((r) => (
              <li key={r.title}>
                <a
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
                >
                  <ExternalLink
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.desc}</p>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <div className="mt-16 rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Ready to scan a repository?</p>
          <a
            href="/"
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Scan a repo
          </a>
        </div>
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
          . Findings are heuristic and evidence-based — always review skills before installing.
        </div>
      </footer>
    </main>
  )
}
