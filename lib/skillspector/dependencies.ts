import type { RepoFile } from "./github"
import type { Finding, Severity } from "./types"

interface Dep {
  name: string
  version: string
  ecosystem: "PyPI" | "npm"
  file: string
  line: number
}

function parsePyPI(file: RepoFile): Dep[] {
  const deps: Dep[] = []
  const lines = file.content.split("\n")
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith("#") || line.startsWith("-")) continue
    const m = line.match(/^([A-Za-z0-9_.\-]+)\s*==\s*([^\s;#,]+)/)
    if (m) deps.push({ name: m[1], version: m[2], ecosystem: "PyPI", file: file.path, line: i + 1 })
  }
  return deps
}

function parseNpm(file: RepoFile): Dep[] {
  const deps: Dep[] = []
  let pkg: Record<string, unknown>
  try {
    pkg = JSON.parse(file.content)
  } catch {
    return deps
  }
  const allDeps: Record<string, unknown> = {
    ...(pkg.dependencies as Record<string, unknown> ?? {}),
    ...(pkg.devDependencies as Record<string, unknown> ?? {}),
  }
  const lines = file.content.split("\n")
  for (const [name, raw] of Object.entries(allDeps)) {
    if (typeof raw !== "string") continue
    // Strip range operators; skip unpinned wildcards
    const version = raw.replace(/^[\^~>=<]+/, "").trim()
    if (!version || version === "*" || version === "latest" || version === "x") continue
    const lineIdx = lines.findIndex((l) => l.includes(`"${name}"`))
    deps.push({ name, version, ecosystem: "npm", file: file.path, line: lineIdx >= 0 ? lineIdx + 1 : 1 })
  }
  return deps
}

interface OsvVuln {
  id: string
  summary?: string
  severity?: Array<{ type: string; score: string }>
}

function cvssToSeverity(vulns: OsvVuln[]): Severity {
  for (const v of vulns) {
    for (const s of v.severity ?? []) {
      const score = parseFloat(s.score)
      if (score >= 9.0) return "CRITICAL"
      if (score >= 7.0) return "HIGH"
    }
  }
  return "HIGH"
}

const MAX_DEPS = 60

export async function checkDependencies(files: RepoFile[]): Promise<Finding[]> {
  const allDeps: Dep[] = []
  for (const file of files) {
    const base = (file.path.split("/").pop() ?? "").toLowerCase()
    if (base === "requirements.txt") allDeps.push(...parsePyPI(file))
    if (base === "package.json") allDeps.push(...parseNpm(file))
  }

  const deps = allDeps.slice(0, MAX_DEPS)
  if (deps.length === 0) return []

  const queries = deps.map((d) => ({
    version: d.version,
    package: { name: d.name, ecosystem: d.ecosystem },
  }))

  let results: Array<{ vulns?: OsvVuln[] }>
  try {
    const res = await fetch("https://api.osv.dev/v1/querybatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queries }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return []
    const data = await res.json()
    results = data.results ?? []
  } catch {
    return []
  }

  const findings: Finding[] = []
  for (let i = 0; i < deps.length; i++) {
    const dep = deps[i]
    const vulns = results[i]?.vulns ?? []
    if (vulns.length === 0) continue

    const topId = vulns[0].id
    const extra = vulns.length > 1 ? ` (+${vulns.length - 1} more)` : ""
    findings.push({
      id: "SC4",
      name: "Known Vulnerable Dependency",
      category: "Supply Chain",
      severity: cvssToSeverity(vulns),
      description: `${dep.name}@${dep.version} has ${vulns.length} known CVE${vulns.length > 1 ? "s" : ""}: ${topId}${extra}`,
      file: dep.file,
      line: dep.line,
      snippet: `${dep.name}==${dep.version}`,
      confidence: 95,
    })
  }

  return findings
}
