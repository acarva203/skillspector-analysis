"use client"

import { useEffect, useState } from "react"
import type { Recommendation } from "@/lib/skillspector/types"
import { recommendationTone } from "@/lib/skillspector/ui"

interface ScoreGaugeProps {
  score: number
  recommendation: Recommendation
}

const toneColor: Record<string, string> = {
  safe: "var(--safe)",
  caution: "var(--caution)",
  danger: "var(--danger)",
}

export function ScoreGauge({ score, recommendation }: ScoreGaugeProps) {
  const tone = recommendationTone(recommendation)
  const color = toneColor[tone]
  const radius = 84
  const circumference = 2 * Math.PI * radius

  const [animated, setAnimated] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(score))
    return () => cancelAnimationFrame(id)
  }, [score])

  const offset = circumference - (animated / 100) * circumference

  return (
    <div className="relative flex h-52 w-52 items-center justify-center">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 200 200" aria-hidden="true">
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth="12"
        />
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-mono text-5xl font-semibold tabular-nums text-foreground">
          {Math.round(animated)}
        </span>
        <span className="mt-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Risk Score
        </span>
      </div>
    </div>
  )
}
