import type { RepoFile } from "./github"
import type {
  Capability,
  Confidence,
  Evidence,
  Finding,
  RepoMeta,
  TrustAssessment,
  TrustDimension,
} from "./types"

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

/* ---------------- File-presence helpers ---------------- */

function hasPath(paths: string[], test: (lower: string, base: string) => boolean): string | null {
  for (const p of paths) {
    const base = (p.split("/").pop() ?? "").toLowerCase()
    if (test(p.toLowerCase(), base)) return p
  }
  return null
}

interface RepoSignals {
  readme: boolean
  license: boolean
  security: boolean
  contributing: boolean
  codeowners: boolean
  changelog: boolean
  ci: boolean
  codeql: boolean
  dependabot: boolean
  lockfile: boolean
  tests: boolean
  examples: boolean
  dockerfile: boolean
}

function detectSignals(paths: string[]): RepoSignals {
  return {
    readme: !!hasPath(paths, (_, b) => b.startsWith("readme")),
    license: !!hasPath(paths, (_, b) => b.startsWith("license") || b.startsWith("licence") || b === "copying"),
    security: !!hasPath(paths, (_, b) => b === "security.md" || b === "security"),
    contributing: !!hasPath(paths, (_, b) => b.startsWith("contributing")),
    codeowners: !!hasPath(paths, (_, b) => b === "codeowners"),
    changelog: !!hasPath(paths, (_, b) => b.startsWith("changelog") || b.startsWith("changes")),
    ci: !!hasPath(paths, (l) => l.includes(".github/workflows/") || l.includes(".gitlab-ci") || l.includes(".circleci/")),
    codeql: !!hasPath(paths, (l) => l.includes("codeql")),
    dependabot: !!hasPath(paths, (l) => l.includes("dependabot")),
    lockfile: !!hasPath(
      paths,
      (_, b) =>
        ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "poetry.lock", "go.sum", "cargo.lock", "gemfile.lock", "composer.lock"].includes(
          b,
        ),
    ),
    tests: !!hasPath(
      paths,
      (l, b) =>
        l.includes("/test/") ||
        l.includes("/tests/") ||
        l.startsWith("test/") ||
        l.startsWith("tests/") ||
        b.includes(".test.") ||
        b.includes(".spec.") ||
        b.startsWith("test_") ||
        b.endsWith("_test.go") ||
        b.endsWith("_test.py"),
    ),
    examples: !!hasPath(paths, (l) => l.includes("/examples/") || l.startsWith("examples/") || l.includes("/example/")),
    dockerfile: !!hasPath(paths, (_, b) => b === "dockerfile"),
  }
}

/* ---------------- Capability detection ---------------- */

interface CapDef {
  key: string
  label: string
  re: RegExp
}

const CAP_DEFS: CapDef[] = [
  {
    key: "filesystem",
    label: "Filesystem",
    re: /\b(open\s*\(|fs\.(readFile|writeFile|appendFile|unlink|rm)|os\.(remove|rename|mkdir)|shutil\.|pathlib|Path\s*\(|fopen|readFileSync|writeFileSync)\b/,
  },
  {
    key: "network",
    label: "Network",
    re: /\b(requests\.(get|post|put|delete)|urllib|httpx|aiohttp|axios|fetch\s*\(|http\.(get|post|request)|socket\.|urlopen|net\/http|HttpClient)\b/,
  },
  {
    key: "shell",
    label: "Shell execution",
    re: /\b(subprocess\.|os\.system|os\.popen|exec\s*\(|execSync|child_process|spawn\s*\(|popen|Runtime\.getRuntime|system\s*\(|eval\s*\()/,
  },
  {
    key: "secrets",
    label: "Secrets / env",
    re: /\b(os\.environ|process\.env|os\.getenv|getenv|API[_-]?KEY|SECRET[_-]?KEY|ACCESS[_-]?TOKEN|PRIVATE[_-]?KEY|AWS_SECRET|password\s*=)/i,
  },
  {
    key: "external",
    label: "External APIs",
    re: /https?:\/\/(?!(?:[\w.-]*\.)?(?:github\.com|githubusercontent\.com|localhost|127\.0\.0\.1|example\.com))[\w.-]+/i,
  },
  {
    key: "destructive",
    label: "Destructive ops",
    re: /\b(rm\s+-rf|shutil\.rmtree|os\.removedirs|DROP\s+TABLE|del\s+\/[a-z]|format\s*\(\s*['"]?[a-z]:|mkfs|dd\s+if=)/i,
  },
]

function detectCapabilities(files: RepoFile[]): Capability[] {
  const codeFiles = files.filter((f) => /\.(py|js|ts|tsx|jsx|sh|bash|rb|go|pl|ps1|php|mjs|cjs)$/.test(f.path))
  const total = Math.max(1, codeFiles.length)

  return CAP_DEFS.map((def) => {
    let hitFiles = 0
    for (const f of codeFiles) {
      if (def.re.test(f.content)) hitFiles++
    }
    // Intensity: share of code files exhibiting the capability, with a floor so a
    // single occurrence still registers visibly.
    const share = hitFiles / total
    const level = hitFiles === 0 ? 0 : clamp(Math.max(18, share * 100))
    return { key: def.key, label: def.label, level, files: hitFiles }
  })
}

/* ---------------- Dimension scoring ---------------- */

function maintenance(meta: RepoMeta): TrustDimension {
  const ev: Evidence[] = []
  let s = 50

  if (meta.archived) {
    s -= 40
    ev.push({ positive: false, text: "Repository is archived (read-only, unmaintained)" })
  }

  if (meta.ageDays === Infinity) {
    ev.push({ positive: false, text: "Repository age is unknown" })
  } else if (meta.ageDays > 365) {
    s += 15
    ev.push({ positive: true, text: `Established project — over ${Math.floor(meta.ageDays / 365)} year(s) old` })
  } else if (meta.ageDays > 90) {
    s += 6
    ev.push({ positive: true, text: "A few months of history" })
  } else {
    s -= 6
    ev.push({ positive: false, text: `New repository (${meta.ageDays} days old)` })
  }

  if (!meta.archived) {
    if (meta.lastPushDays <= 30) {
      s += 15
      ev.push({ positive: true, text: "Active — pushed within the last 30 days" })
    } else if (meta.lastPushDays <= 180) {
      s += 4
      ev.push({ positive: true, text: "Updated within the last 6 months" })
    } else if (meta.lastPushDays <= 365) {
      s -= 10
      ev.push({ positive: false, text: "No commits in over 6 months" })
    } else {
      s -= 22
      ev.push({ positive: false, text: "Stale — no commits in over a year" })
    }
  }

  if (meta.releases >= 3) {
    s += 10
    ev.push({ positive: true, text: `${meta.releases} tagged releases` })
  } else if (meta.releases >= 1) {
    s += 4
    ev.push({ positive: true, text: "Has at least one tagged release" })
  } else {
    s -= 5
    ev.push({ positive: false, text: "No tagged releases" })
  }

  if (meta.contributors >= 5) {
    s += 10
    ev.push({ positive: true, text: `${meta.contributors}${meta.contributorsCapped ? "+" : ""} contributors` })
  } else if (meta.contributors >= 2) {
    s += 4
    ev.push({ positive: true, text: `${meta.contributors} contributors` })
  } else if (meta.contributors === 1) {
    s -= 10
    ev.push({ positive: false, text: "Single maintainer — bus-factor risk" })
  }

  return {
    key: "maintenance",
    label: "Maintenance",
    score: clamp(s),
    description: "Is this an actively maintained engineering project?",
    evidence: ev,
  }
}

function supplyChain(signals: RepoSignals, caps: Capability[], findings: Finding[]): TrustDimension {
  const ev: Evidence[] = []
  let s = 72

  if (signals.lockfile) {
    s += 10
    ev.push({ positive: true, text: "Dependencies pinned via a lockfile" })
  } else {
    s -= 10
    ev.push({ positive: false, text: "No dependency lockfile found" })
  }

  const supplyFindings = findings.filter((f) => f.category === "Supply Chain")
  const curlBash = findings.some((f) => /curl|wget|bash|sh -c|remote script/i.test(f.name + f.description))
  const installScript = findings.some((f) => /install|postinstall|lifecycle/i.test(f.name + f.description))

  if (curlBash) {
    s -= 25
    ev.push({ positive: false, text: "Downloads and executes remote scripts (curl | bash style)" })
  }
  if (installScript) {
    s -= 18
    ev.push({ positive: false, text: "Defines install / lifecycle scripts" })
  }
  if (supplyFindings.length > 0 && !curlBash && !installScript) {
    s -= 10
    ev.push({ positive: false, text: `${supplyFindings.length} supply-chain pattern(s) detected` })
  }

  const ext = caps.find((c) => c.key === "external")
  if (ext && ext.files > 0) {
    s -= 6
    ev.push({ positive: false, text: "References external (non-GitHub) endpoints" })
  }

  if (signals.dependabot) {
    s += 8
    ev.push({ positive: true, text: "Automated dependency updates (Dependabot)" })
  }

  return {
    key: "supply",
    label: "Supply chain",
    score: clamp(s),
    description: "How safe are dependencies and build/install behavior?",
    evidence: ev,
  }
}

function securityHygiene(signals: RepoSignals): TrustDimension {
  const ev: Evidence[] = []
  let s = 42

  if (signals.ci) {
    s += 15
    ev.push({ positive: true, text: "Continuous integration configured" })
  } else {
    s -= 10
    ev.push({ positive: false, text: "No CI configuration found" })
  }
  if (signals.codeql) {
    s += 15
    ev.push({ positive: true, text: "Static analysis (CodeQL / code scanning)" })
  }
  if (signals.dependabot) {
    s += 8
    ev.push({ positive: true, text: "Dependency vulnerability alerts enabled" })
  }
  if (signals.security) {
    s += 12
    ev.push({ positive: true, text: "Publishes a security policy (SECURITY.md)" })
  } else {
    s -= 6
    ev.push({ positive: false, text: "No SECURITY.md / disclosure policy" })
  }
  if (signals.tests) {
    s += 10
    ev.push({ positive: true, text: "Includes a test suite" })
  } else {
    s -= 8
    ev.push({ positive: false, text: "No tests detected" })
  }

  return {
    key: "security",
    label: "Security hygiene",
    score: clamp(s),
    description: "Evidence of security engineering practices.",
    evidence: ev,
  }
}

function engineering(signals: RepoSignals, meta: RepoMeta): TrustDimension {
  const ev: Evidence[] = []
  let s = 42

  if (signals.readme) {
    s += 14
    ev.push({ positive: true, text: "Has a README" })
  } else {
    s -= 12
    ev.push({ positive: false, text: "No README" })
  }
  if (signals.tests) {
    s += 10
    ev.push({ positive: true, text: "Has tests" })
  }
  if (signals.ci) {
    s += 8
    ev.push({ positive: true, text: "Uses CI" })
  }
  if (signals.contributing) {
    s += 5
    ev.push({ positive: true, text: "Contribution guidelines" })
  }
  if (signals.changelog) {
    s += 5
    ev.push({ positive: true, text: "Maintains a changelog" })
  }
  if (signals.codeowners) {
    s += 4
    ev.push({ positive: true, text: "Defines code owners" })
  }
  if (signals.examples) {
    s += 4
    ev.push({ positive: true, text: "Ships usage examples" })
  }
  if (meta.stars >= 500) {
    s += 8
    ev.push({ positive: true, text: `${meta.stars.toLocaleString()} stars — broad community use` })
  } else if (meta.stars >= 50) {
    s += 4
    ev.push({ positive: true, text: `${meta.stars} stars` })
  }

  return {
    key: "engineering",
    label: "Engineering quality",
    score: clamp(s),
    description: "Documentation, testing, and project hygiene.",
    evidence: ev,
  }
}

function permissionSafety(caps: Capability[]): TrustDimension {
  const ev: Evidence[] = []
  let s = 100
  const by = (k: string) => caps.find((c) => c.key === k)

  const shell = by("shell")
  const fs = by("filesystem")
  const net = by("network")
  const sec = by("secrets")
  const dest = by("destructive")

  if (shell && shell.files > 0) {
    s -= 26
    ev.push({ positive: false, text: `Executes shell / dynamic code (${shell.files} file(s))` })
  }
  if (dest && dest.files > 0) {
    s -= 22
    ev.push({ positive: false, text: `Contains destructive operations (${dest.files} file(s))` })
  }
  if (sec && sec.files > 0) {
    s -= 16
    ev.push({ positive: false, text: `Accesses secrets / environment variables (${sec.files} file(s))` })
  }
  if (fs && fs.files > 0) {
    s -= 14
    ev.push({ positive: false, text: `Reads/writes the filesystem (${fs.files} file(s))` })
  }
  if (net && net.files > 0) {
    s -= 10
    ev.push({ positive: false, text: `Makes network requests (${net.files} file(s))` })
  }
  if (ev.length === 0) {
    ev.push({ positive: true, text: "No high-risk capabilities detected" })
  }

  return {
    key: "permission",
    label: "Permission safety",
    score: clamp(s),
    description: "The less authority a skill demands, the lower the blast radius.",
    evidence: ev,
  }
}

function transparency(signals: RepoSignals, meta: RepoMeta, findings: Finding[]): TrustDimension {
  const ev: Evidence[] = []
  let s = 50

  if (signals.readme) {
    s += 12
    ev.push({ positive: true, text: "Documented via README" })
  }
  if (meta.license) {
    s += 12
    ev.push({ positive: true, text: `Licensed (${meta.license})` })
  } else {
    s -= 12
    ev.push({ positive: false, text: "No license declared" })
  }
  if (meta.description) {
    s += 5
    ev.push({ positive: true, text: "Has a project description" })
  }
  if (meta.homepage) {
    s += 4
    ev.push({ positive: true, text: "Links a homepage / docs site" })
  }
  if (meta.ownerType === "Organization") {
    s += 10
    ev.push({ positive: true, text: "Owned by an organization account" })
  } else {
    ev.push({ positive: false, text: "Owned by an individual account" })
  }

  const obfuscation = findings.some((f) =>
    /(obfuscat|encoded|base64|eval|hidden|invisible|zero-width)/i.test(f.name + f.description),
  )
  if (obfuscation) {
    s -= 24
    ev.push({ positive: false, text: "Contains obfuscated or encoded code" })
  }

  return {
    key: "transparency",
    label: "Transparency",
    score: clamp(s),
    description: "Can a user understand what this does and who is behind it?",
    evidence: ev,
  }
}

/* ---------------- Orchestration ---------------- */

const WEIGHTS: Record<string, number> = {
  maintenance: 0.2,
  supply: 0.2,
  security: 0.2,
  engineering: 0.15,
  permission: 0.15,
  transparency: 0.1,
}

function computeConfidence(
  meta: RepoMeta,
  filesScanned: number,
  truncated: boolean,
): { level: Confidence; reason: string } {
  const missing: string[] = []
  if (filesScanned < 5) missing.push("very few files to analyze")
  if (meta.ageDays !== Infinity && meta.ageDays < 30) missing.push("little repository history")
  if (meta.contributors === 0) missing.push("contributor data unavailable")
  if (meta.releases === 0) missing.push("no release history")

  if (filesScanned >= 12 && meta.ageDays > 180 && meta.contributors > 0 && !truncated) {
    return {
      level: "HIGH",
      reason: "Assessment draws on a substantial codebase and a meaningful project history.",
    }
  }
  if (filesScanned < 5 || (meta.ageDays !== Infinity && meta.ageDays < 14) || missing.length >= 3) {
    return {
      level: "LOW",
      reason: `Limited evidence available — ${missing.slice(0, 3).join(", ") || "small repository"}.`,
    }
  }
  return {
    level: "MEDIUM",
    reason: missing.length
      ? `Some signals are missing — ${missing.slice(0, 2).join(", ")}.`
      : "A reasonable amount of evidence was available, but some signals are weak.",
  }
}

export function assessTrust(
  meta: RepoMeta,
  files: RepoFile[],
  allPaths: string[],
  findings: Finding[],
  truncated: boolean,
): TrustAssessment {
  const signals = detectSignals(allPaths)
  const capabilities = detectCapabilities(files)

  const dimensions: TrustDimension[] = [
    maintenance(meta),
    supplyChain(signals, capabilities, findings),
    securityHygiene(signals),
    engineering(signals, meta),
    permissionSafety(capabilities),
    transparency(signals, meta, findings),
  ]

  const trustScore = clamp(
    dimensions.reduce((acc, d) => acc + d.score * (WEIGHTS[d.key] ?? 0), 0),
  )

  const { level: confidence, reason: confidenceReason } = computeConfidence(
    meta,
    files.length,
    truncated,
  )

  // Build a prioritized "why" list: risks (negatives) first, then strengths.
  const negatives: Evidence[] = []
  const positives: Evidence[] = []
  for (const d of dimensions) {
    for (const e of d.evidence) {
      ;(e.positive ? positives : negatives).push(e)
    }
  }
  const reasons = [...negatives.slice(0, 7), ...positives.slice(0, 5)]

  const summary =
    trustScore >= 70
      ? "Strong evidence of trustworthiness. Standard review still recommended before installing."
      : trustScore >= 45
        ? "Mixed signals. Review the flagged risks and missing evidence before relying on this skill."
        : "Limited evidence of trustworthiness. Treat as untrusted until the gaps below are addressed."

  return {
    trustScore,
    confidence,
    confidenceReason,
    summary,
    dimensions,
    capabilities,
    reasons,
    meta,
  }
}
