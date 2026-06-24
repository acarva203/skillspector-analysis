"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, BrainCircuit, CheckCircle2, FileCode, Loader2, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react"
import type { ScanResult } from "@/lib/skillspector/types"
import type { EnhancementResult, Verdict } from "@/lib/skillspector/llm"
import { recommendationTone, SEVERITY_ORDER, severityClasses } from "@/lib/skillspector/ui"
import { ScoreGauge } from "./score-gauge"
import { FindingsList } from "./findings-list"

export interface ScanResponse extends ScanResult {
  branch: string
  truncated: boolean
}

type EnhancementState =
  | { status: "loading" }
  | { status: "done"; summary: string; verdicts: Map<string, Verdict> }
  | { status: "unavailable" }
  | { status: "error" }

const recIcon = {
  safe: ShieldCheck,
  caution: ShieldAlert,
  danger: ShieldX,
}

const recLabel = {
  SAFE: "Safe to install",
  CAUTION: "Install with caution",
  "DO NOT INSTALL": "Do not install",
}

export function ResultReport({ result }: { result: ScanResponse }) {
  const tone = recommendationTone(result.recommendation)
  const RecIcon = recIcon[tone]
  const toneText =
    tone === "safe" ? "text-safe" : tone === "caution" ? "text-caution" : "text-danger"
  const toneBg =
    tone === "safe"
      ? "bg-safe/10 border-safe/30"
      : tone === "caution"
        ? "bg-caution/10 border-caution/30"
        : "bg-danger/10 border-danger/30"

  const [enhancement, setEnhancement] = useState<EnhancementState | null>(null)

  useEffect(() => {
    if (result.findings.length === 0) return
    setEnhancement({ status: "loading" })

    fetch("/api/scan/enhance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result }),
    })
      .then(async (res) => {
        if (res.status === 503) { setEnhancement({ status: "unavailable" }); return }
        if (!res.ok) { setEnhancement({ status: "error" }); return }
        const data: EnhancementResult = await res.json()
        const verdicts = new Map(data.verdicts.map((v) => [`${v.id}:${v.file}`, v]))
        setEnhancement({ status: "done", summary: data.summary, verdicts })
      })
      .catch(() => setEnhancement({ status: "error" }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.skill, result.scannedAt])

  const verdicts =
    enhancement?.status === "done" ? enhancement.verdicts : new Map<string, Verdict>()

  return (
    <section className="mx-auto w-full max-w-5xl">
      {/* Summary card */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <ScoreGauge score={result.score} recommendation={result.recommendation} />
            <div className="text-center sm:text-left">
              <p className="font-mono text-sm text-muted-foreground">{result.source}</p>
              <h2 className="mt-1 text-2xl font-semibold text-foreground">{result.skill}</h2>
              <div
                className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${toneBg} ${toneText}`}
              >
                <RecIcon className="h-4 w-4" aria-hidden="true" />
                {recLabel[result.recommendation]}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Severity <span className="font-medium text-foreground">{result.level}</span> ·{" "}
                {result.findings.length} finding{result.findings.length === 1 ? "" : "s"} across{" "}
                {result.filesScanned} files · branch{" "}
                <span className="font-mono">{result.branch}</span>
              </p>
            </div>
          </div>

          {/* Severity breakdown */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-1 md:gap-2">
            {SEVERITY_ORDER.map((sev) => (
              <div
                key={sev}
                className="flex items-center justify-between gap-6 rounded-lg border border-border bg-background/40 px-3 py-2"
              >
                <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span className={`h-2 w-2 rounded-full ${severityClasses[sev].dot}`} />
                  {sev}
                </span>
                <span className="font-mono text-sm tabular-nums text-foreground">
                  {result.severityCounts[sev]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {result.truncated && (
          <div className="flex items-center gap-2 border-t border-border bg-caution/5 px-6 py-3 text-xs text-caution">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            This repository is large — analysis was limited to the first batch of scannable files.
          </div>
        )}
      </div>

      {/* AI analysis panel */}
      {enhancement && enhancement.status !== "unavailable" && (
        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <BrainCircuit className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="text-sm font-medium text-foreground">AI Analysis</span>
            {enhancement.status === "loading" && (
              <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden="true" />
            )}
          </div>
          <div className="px-4 py-3">
            {enhancement.status === "loading" && (
              <p className="text-sm text-muted-foreground">Reviewing findings for false positives…</p>
            )}
            {enhancement.status === "done" && (
              <p className="text-sm leading-relaxed text-foreground">{enhancement.summary}</p>
            )}
            {enhancement.status === "error" && (
              <p className="text-sm text-muted-foreground">AI analysis unavailable — static results above are unaffected.</p>
            )}
          </div>
        </div>
      )}

      {/* Findings */}
      <div className="mt-8">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
          <ShieldAlert className="h-5 w-5 text-primary" aria-hidden="true" />
          Findings
        </h3>
        {result.findings.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-safe/30 bg-safe/5 px-6 py-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-safe" aria-hidden="true" />
            <p className="text-base font-medium text-foreground">No vulnerability patterns detected</p>
            <p className="max-w-md text-sm text-muted-foreground">
              The static analyzer found no matches across its 67 patterns. This does not guarantee
              safety — always review skills before installing.
            </p>
          </div>
        ) : (
          <FindingsList findings={result.findings} verdicts={verdicts} />
        )}
      </div>

      {/* Components */}
      <div className="mt-8">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
          <FileCode className="h-5 w-5 text-primary" aria-hidden="true" />
          Components scanned ({result.components.length})
        </h3>
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 border-b border-border bg-card px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <span>File</span>
            <span className="text-right">Type</span>
            <span className="text-right">Lines</span>
            <span className="text-right">Exec</span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {result.components.map((c) => (
              <div
                key={c.file}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b border-border/60 px-4 py-2 text-sm last:border-0"
              >
                <span className="truncate font-mono text-foreground" title={c.file}>
                  {c.file}
                </span>
                <span className="text-right text-muted-foreground">{c.type}</span>
                <span className="text-right font-mono tabular-nums text-muted-foreground">
                  {c.lines}
                </span>
                <span className="text-right">
                  {c.executable ? (
                    <span className="text-caution">Yes</span>
                  ) : (
                    <span className="text-muted-foreground">No</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
