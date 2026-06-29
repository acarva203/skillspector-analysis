export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

export type Recommendation = "SAFE" | "CAUTION" | "DO NOT INSTALL"

export interface PatternDef {
  id: string
  name: string
  category: string
  severity: Severity
  description: string
  /** Regexes that indicate a match. Any match flags the pattern. */
  patterns: RegExp[]
  /** Restrict matching to these file extensions (without dot). Empty = all. */
  extensions?: string[]
}

export interface Finding {
  id: string
  name: string
  category: string
  severity: Severity
  description: string
  file: string
  line: number
  snippet: string
  confidence: number
}

export interface Component {
  file: string
  type: string
  lines: number
  executable: boolean
}

export interface ScanResult {
  skill: string
  source: string
  scannedAt: string
  score: number
  level: RiskLevel
  recommendation: Recommendation
  components: Component[]
  findings: Finding[]
  filesScanned: number
  categoryCounts: Record<string, number>
  severityCounts: Record<Severity, number>
}

/* ----------------------- Trust assessment ----------------------- */

export type Confidence = "HIGH" | "MEDIUM" | "LOW"

export interface Evidence {
  /** true = supports trust, false = detracts from trust */
  positive: boolean
  text: string
}

export interface TrustDimension {
  key: string
  label: string
  /** 0-100, higher = more trustworthy */
  score: number
  description: string
  evidence: Evidence[]
}

export interface Capability {
  key: string
  label: string
  /** 0-100 intensity of this capability in the codebase */
  level: number
  files: number
}

export interface RepoMeta {
  owner: string
  repo: string
  branch: string
  ownerType: string
  description: string | null
  homepage: string | null
  license: string | null
  stars: number
  forks: number
  watchers: number
  openIssues: number
  archived: boolean
  ageDays: number
  lastPushDays: number
  contributors: number
  contributorsCapped: boolean
  releases: number
  topics: string[]
}

export interface TrustAssessment {
  /** 0-100 overall, higher = more evidence the repo deserves trust */
  trustScore: number
  confidence: Confidence
  confidenceReason: string
  summary: string
  dimensions: TrustDimension[]
  capabilities: Capability[]
  /** Top-level explainable "why" bullets, risks first */
  reasons: Evidence[]
  meta: RepoMeta
}
