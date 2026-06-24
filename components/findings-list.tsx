"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import type { Finding } from "@/lib/skillspector/types"
import { severityClasses } from "@/lib/skillspector/ui"

export function FindingsList({ findings }: { findings: Finding[] }) {
  return (
    <div className="flex flex-col gap-3">
      {findings.map((f, i) => (
        <FindingRow key={`${f.id}-${f.file}-${i}`} finding={f} />
      ))}
    </div>
  )
}

function FindingRow({ finding }: { finding: Finding }) {
  const [open, setOpen] = useState(false)
  const sc = severityClasses[finding.severity]

  return (
    <div className={`overflow-hidden rounded-lg border ${sc.border} bg-card`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40"
        aria-expanded={open}
      >
        <span
          className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${sc.bg} ${sc.text} ${sc.border}`}
        >
          {finding.severity}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-medium text-foreground">{finding.name}</span>
            <span className="font-mono text-xs text-muted-foreground">({finding.id})</span>
          </span>
          <span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">
            {finding.file}:{finding.line}
          </span>
        </span>
        <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
          {finding.confidence}% confidence
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="border-t border-border px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {finding.category}
          </p>
          <p className="mt-1.5 text-sm text-foreground">{finding.description}</p>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Matched code
          </p>
          <pre className="mt-1.5 overflow-x-auto rounded-md border border-border bg-background/60 px-3 py-2 font-mono text-xs text-foreground">
            <code>{finding.snippet || "—"}</code>
          </pre>
        </div>
      )}
    </div>
  )
}
