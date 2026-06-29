"use client"

import { useState } from "react"
import {
  Check,
  ChevronDown,
  GitFork,
  Scale,
  Star,
  TriangleAlert,
  Users,
  X,
} from "lucide-react"
import type { Capability, TrustAssessment, TrustDimension } from "@/lib/skillspector/types"
import {
  confidenceTone,
  toneBarBg,
  toneText,
  toneVar,
  trustTone,
} from "@/lib/skillspector/ui"
import { ScoreGauge } from "./score-gauge"

export function TrustReport({ trust }: { trust: TrustAssessment }) {
  const tone = trustTone(trust.trustScore)
  const confTone = confidenceTone[trust.confidence]

  return (
    <section className="mx-auto w-full max-w-5xl">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center">
          <div className="flex shrink-0 justify-center">
            <ScoreGauge score={trust.trustScore} color={toneVar[tone]} label="Trust Score" />
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium border-border bg-background/50 ${toneText[confTone]}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${toneBarBg[confTone]}`} />
                {trust.confidence} confidence
              </span>
              <span className="text-xs text-muted-foreground">{trust.confidenceReason}</span>
            </div>

            <p className="mt-3 text-pretty leading-relaxed text-foreground">{trust.summary}</p>

            <MetaChips trust={trust} />
          </div>
        </div>

        {/* Explainable reasons */}
        <div className="border-t border-border p-6">
          <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Why this score
          </h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {trust.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                {r.positive ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-safe" aria-hidden="true" />
                ) : (
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
                )}
                <span className="text-foreground">{r.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Dimensions + capability profile */}
      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Trust dimensions</h3>
          <div className="flex flex-col gap-2.5">
            {trust.dimensions.map((d) => (
              <DimensionRow key={d.key} dim={d} />
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Capability profile</h3>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-col gap-3.5">
              {trust.capabilities.map((c) => (
                <CapabilityBar key={c.key} cap={c} />
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Higher bars mean the skill exercises more of that capability — more authority means a
              larger blast radius if misused.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function MetaChips({ trust }: { trust: TrustAssessment }) {
  const m = trust.meta
  const age =
    m.ageDays === Infinity
      ? "unknown age"
      : m.ageDays > 365
        ? `${Math.floor(m.ageDays / 365)}y old`
        : `${m.ageDays}d old`
  const chips = [
    { icon: Star, text: `${m.stars.toLocaleString()} stars` },
    { icon: GitFork, text: `${m.forks.toLocaleString()} forks` },
    { icon: Users, text: `${m.contributors}${m.contributorsCapped ? "+" : ""} contributors` },
    { icon: Scale, text: m.license ?? "no license" },
  ]
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/50 px-2.5 py-1 text-xs text-muted-foreground">
        {m.ownerType === "Organization" ? "Org" : "User"} · {age}
      </span>
      {chips.map((c, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/50 px-2.5 py-1 text-xs text-muted-foreground"
        >
          <c.icon className="h-3.5 w-3.5" aria-hidden="true" />
          {c.text}
        </span>
      ))}
      {m.archived && (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-danger/30 bg-danger/10 px-2.5 py-1 text-xs text-danger">
          <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
          archived
        </span>
      )}
    </div>
  )
}

function DimensionRow({ dim }: { dim: TrustDimension }) {
  const [open, setOpen] = useState(false)
  const tone = trustTone(dim.score)

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40"
        aria-expanded={open}
      >
        <span className="w-32 shrink-0 text-sm font-medium text-foreground">{dim.label}</span>
        <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-border">
          <span
            className={`absolute inset-y-0 left-0 rounded-full ${toneBarBg[tone]}`}
            style={{ width: `${dim.score}%`, transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)" }}
          />
        </span>
        <span className={`w-10 shrink-0 text-right font-mono text-sm tabular-nums ${toneText[tone]}`}>
          {dim.score}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className="border-t border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">{dim.description}</p>
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {dim.evidence.map((e, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                {e.positive ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-safe" aria-hidden="true" />
                ) : (
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
                )}
                <span className="text-foreground">{e.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function CapabilityBar({ cap }: { cap: Capability }) {
  // 12-segment block meter, SkillSpector-style.
  const segments = 12
  const filled = Math.round((cap.level / 100) * segments)
  const tone = cap.level >= 70 ? "danger" : cap.level >= 35 ? "caution" : cap.level > 0 ? "safe" : "safe"
  const activeColor = cap.level > 0 ? toneBarBg[tone] : "bg-border"

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm text-foreground">{cap.label}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {cap.files === 0 ? "none" : `${cap.files} file${cap.files === 1 ? "" : "s"}`}
        </span>
      </div>
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: segments }).map((_, i) => (
          <span
            key={i}
            className={`h-2.5 flex-1 rounded-sm ${i < filled ? activeColor : "bg-border/60"}`}
          />
        ))}
      </div>
    </div>
  )
}
