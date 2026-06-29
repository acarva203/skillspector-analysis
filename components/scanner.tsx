"use client"

import { useState } from "react"
import { Loader2, Search, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ResultReport, type ScanResponse } from "./result-report"

const EXAMPLES = [
  "https://github.com/NVIDIA/SkillSpector",
  "https://github.com/anthropics/anthropic-quickstarts",
]

export function Scanner() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResponse | null>(null)

  async function scan(target: string) {
    if (!target.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Something went wrong while scanning.")
      } else {
        setResult(data as ScanResponse)
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    scan(url)
  }

  return (
    <div className="flex flex-col gap-10">
      <form onSubmit={onSubmit} className="mx-auto w-full max-w-2xl">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-2 sm:flex-row sm:items-center sm:rounded-full">
          <div className="flex flex-1 items-center gap-2 px-3">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 shrink-0 fill-muted-foreground"
              aria-hidden="true"
            >
              <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1.16-.02-2.1-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
            </svg>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              aria-label="GitHub repository URL"
              className="h-11 w-full bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !url.trim()}
            className="h-11 shrink-0 rounded-full px-6 sm:rounded-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Scanning
              </>
            ) : (
              <>
                <Search className="h-4 w-4" aria-hidden="true" />
                Scan repo
              </>
            )}
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground">Try:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setUrl(ex)
                scan(ex)
              }}
              disabled={loading}
              className="rounded-full border border-border px-3 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50"
            >
              {ex.replace("https://github.com/", "")}
            </button>
          ))}
        </div>
      </form>

      {error && (
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      {loading && (
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">Gathering trust signals…</p>
          <p className="text-xs text-muted-foreground">
            Reading repository metadata, maintenance history, supply-chain and permission signals,
            and matching 64 vulnerability patterns.
          </p>
        </div>
      )}

      {result && !loading && <ResultReport result={result} />}
    </div>
  )
}
