import { PATTERNS } from "./patterns"
import type { RepoFile } from "./github"
import type {
  Component,
  Finding,
  Recommendation,
  RiskLevel,
  ScanResult,
  Severity,
} from "./types"

const SEVERITY_POINTS: Record<Severity, number> = {
  CRITICAL: 50,
  HIGH: 25,
  MEDIUM: 10,
  LOW: 5,
}

const SEVERITY_CONFIDENCE: Record<Severity, number> = {
  CRITICAL: 95,
  HIGH: 88,
  MEDIUM: 78,
  LOW: 70,
}

const EXECUTABLE_EXTS = new Set(["py", "sh", "bash", "js", "ts", "rb", "go", "pl", "ps1", "mjs", "cjs"])

function getExt(path: string): string {
  const base = path.split("/").pop() ?? ""
  const dot = base.lastIndexOf(".")
  return dot >= 0 ? base.slice(dot + 1).toLowerCase() : ""
}

function fileType(path: string): string {
  const ext = getExt(path)
  const map: Record<string, string> = {
    py: "python", js: "javascript", ts: "typescript", tsx: "typescript",
    jsx: "javascript", sh: "shell", bash: "shell", md: "markdown",
    txt: "text", json: "json", yaml: "yaml", yml: "yaml", toml: "toml",
    rb: "ruby", go: "go", php: "php", ps1: "powershell",
  }
  return map[ext] ?? (ext || "text")
}

function isExecutable(path: string): boolean {
  const base = (path.split("/").pop() ?? "").toLowerCase()
  if (base === "dockerfile" || base === "makefile") return true
  return EXECUTABLE_EXTS.has(getExt(path))
}

function lineOf(content: string, index: number): number {
  let line = 1
  for (let i = 0; i < index && i < content.length; i++) {
    if (content[i] === "\n") line++
  }
  return line
}

function snippetAt(content: string, index: number): string {
  const start = content.lastIndexOf("\n", index) + 1
  let end = content.indexOf("\n", index)
  if (end === -1) end = content.length
  const raw = content.slice(start, end).trim()
  return raw.length > 160 ? raw.slice(0, 157) + "..." : raw
}

export function scanFiles(files: RepoFile[], skill: string, source: string): ScanResult {
  const findings: Finding[] = []
  const components: Component[] = files.map((f) => ({
    file: f.path,
    type: fileType(f.path),
    lines: f.lines,
    executable: isExecutable(f.path),
  }))

  const hasExecutable = components.some((c) => c.executable)

  for (const file of files) {
    const ext = getExt(file.path)
    for (const pattern of PATTERNS) {
      if (pattern.patterns.length === 0) continue
      if (pattern.extensions && pattern.extensions.length > 0 && !pattern.extensions.includes(ext)) {
        continue
      }
      // Find the first match per pattern per file to avoid noise.
      for (const re of pattern.patterns) {
        const flags = re.flags.includes("g") ? re.flags : re.flags + "g"
        const rx = new RegExp(re.source, flags)
        const match = rx.exec(file.content)
        if (match) {
          findings.push({
            id: pattern.id,
            name: pattern.name,
            category: pattern.category,
            severity: pattern.severity,
            description: pattern.description,
            file: file.path,
            line: lineOf(file.content, match.index),
            snippet: snippetAt(file.content, match.index),
            confidence: SEVERITY_CONFIDENCE[pattern.severity],
          })
          break // one finding per pattern per file
        }
      }
    }
  }

  // Sort findings: severity desc, then file.
  const order: Record<Severity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
  findings.sort((a, b) => order[a.severity] - order[b.severity] || a.file.localeCompare(b.file))

  // Score.
  let raw = 0
  for (const f of findings) raw += SEVERITY_POINTS[f.severity]
  if (hasExecutable) raw *= 1.3
  const score = Math.min(100, Math.round(raw))

  const level = riskLevel(score)
  const recommendation = recommend(score)

  const severityCounts: Record<Severity, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
  const categoryCounts: Record<string, number> = {}
  for (const f of findings) {
    severityCounts[f.severity]++
    categoryCounts[f.category] = (categoryCounts[f.category] ?? 0) + 1
  }

  return {
    skill,
    source,
    scannedAt: new Date().toISOString(),
    score,
    level,
    recommendation,
    components,
    findings,
    filesScanned: files.length,
    categoryCounts,
    severityCounts,
  }
}

function riskLevel(score: number): RiskLevel {
  if (score <= 20) return "LOW"
  if (score <= 50) return "MEDIUM"
  if (score <= 80) return "HIGH"
  return "CRITICAL"
}

function recommend(score: number): Recommendation {
  if (score <= 20) return "SAFE"
  if (score <= 50) return "CAUTION"
  return "DO NOT INSTALL"
}
