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
