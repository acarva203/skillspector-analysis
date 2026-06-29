"use client"

import { useEffect, useState } from "react"

interface ScoreGaugeProps {
  score: number
  /** CSS color (e.g. "var(--danger)") for the progress arc. */
  color: string
  /** Caption shown under the number. */
  label: string
  size?: "sm" | "lg"
}

export function ScoreGauge({ score, color, label, size = "lg" }: ScoreGaugeProps) {
  const radius = 84
  const circumference = 2 * Math.PI * radius

  const [animated, setAnimated] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(score))
    return () => cancelAnimationFrame(id)
  }, [score])

  const offset = circumference - (animated / 100) * circumference
  const box = size === "lg" ? "h-52 w-52" : "h-40 w-40"
  const num = size === "lg" ? "text-5xl" : "text-4xl"

  return (
    <div className={`relative flex items-center justify-center ${box}`}>
      <svg className="h-full w-full -rotate-90" viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r={radius} fill="none" stroke="var(--border)" strokeWidth="12" />
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
        <span className={`font-mono ${num} font-semibold tabular-nums text-foreground`}>
          {Math.round(animated)}
        </span>
        <span className="mt-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  )
}
