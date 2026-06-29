import type { Confidence, Recommendation, Severity } from "./types"

export function recommendationTone(rec: Recommendation): "safe" | "caution" | "danger" {
  if (rec === "SAFE") return "safe"
  if (rec === "CAUTION") return "caution"
  return "danger"
}

/** Trust is "higher = better": invert the tone bands relative to risk. */
export function trustTone(score: number): "safe" | "caution" | "danger" {
  if (score >= 70) return "safe"
  if (score >= 45) return "caution"
  return "danger"
}

export const toneVar: Record<"safe" | "caution" | "danger", string> = {
  safe: "var(--safe)",
  caution: "var(--caution)",
  danger: "var(--danger)",
}

export const toneText: Record<"safe" | "caution" | "danger", string> = {
  safe: "text-safe",
  caution: "text-caution",
  danger: "text-danger",
}

export const toneBarBg: Record<"safe" | "caution" | "danger", string> = {
  safe: "bg-safe",
  caution: "bg-caution",
  danger: "bg-danger",
}

export const confidenceTone: Record<Confidence, "safe" | "caution" | "danger"> = {
  HIGH: "safe",
  MEDIUM: "caution",
  LOW: "danger",
}

export const severityClasses: Record<
  Severity,
  { text: string; bg: string; border: string; dot: string }
> = {
  CRITICAL: {
    text: "text-danger",
    bg: "bg-danger/10",
    border: "border-danger/30",
    dot: "bg-danger",
  },
  HIGH: {
    text: "text-danger",
    bg: "bg-danger/10",
    border: "border-danger/25",
    dot: "bg-danger",
  },
  MEDIUM: {
    text: "text-caution",
    bg: "bg-caution/10",
    border: "border-caution/30",
    dot: "bg-caution",
  },
  LOW: {
    text: "text-safe",
    bg: "bg-safe/10",
    border: "border-safe/30",
    dot: "bg-safe",
  },
}

export const SEVERITY_ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
