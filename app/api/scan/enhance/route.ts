import { type NextRequest, NextResponse } from "next/server"
import { getProvider, enhanceWithLLM } from "@/lib/skillspector/llm"
import type { ScanResult } from "@/lib/skillspector/types"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  if (!getProvider()) {
    return NextResponse.json({ error: "No LLM provider configured." }, { status: 503 })
  }

  let body: { result?: ScanResult }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const result = body.result
  if (!result?.skill || !Array.isArray(result.findings)) {
    return NextResponse.json({ error: "Missing scan result." }, { status: 400 })
  }

  if (result.findings.length === 0) {
    return NextResponse.json({ summary: "No findings to analyze.", verdicts: [] })
  }

  try {
    const enhancement = await enhanceWithLLM(result.skill, result.findings)
    return NextResponse.json(enhancement)
  } catch (err) {
    const message = err instanceof Error ? err.message : "LLM enhancement failed."
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
