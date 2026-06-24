import type { Finding } from "./types"

export interface Verdict {
  id: string
  file: string
  verdict: "confirmed" | "false_positive"
  note: string
}

export interface EnhancementResult {
  summary: string
  verdicts: Verdict[]
}

export function getProvider(): "gemini" | null {
  return process.env.GEMINI_API_KEY ? "gemini" : null
}

// Cap findings sent to the LLM to avoid large prompts.
const MAX_FINDINGS_FOR_LLM = 25

function buildPrompt(skill: string, findings: Finding[]): string {
  const top = findings.slice(0, MAX_FINDINGS_FOR_LLM)
  const lines = top.map(
    (f) => `[${f.id}] ${f.severity} ${f.name} | ${f.file}:${f.line}\n  snippet: ${f.snippet.slice(0, 120)}`,
  )
  return `You are a security analyst reviewing static analysis findings for an AI agent skill or MCP server.

Repository: ${skill}
Findings (${top.length} of ${findings.length} shown, highest severity first):
${lines.join("\n")}

For each finding classify it as:
- "confirmed": genuinely suspicious or dangerous
- "false_positive": benign code that triggered a heuristic

Respond with ONLY valid JSON, no markdown fences:
{"summary":"2-3 sentence overall assessment","verdicts":[{"id":"PATTERN_ID","file":"path","verdict":"confirmed or false_positive","note":"one sentence reason"}]}`
}

function extractJson(text: string): EnhancementResult {
  // Strip markdown fences if the model added them anyway.
  const stripped = text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim()
  const parsed = JSON.parse(stripped)
  if (!parsed.summary || !Array.isArray(parsed.verdicts)) {
    throw new Error("Unexpected LLM response shape")
  }
  return parsed as EnhancementResult
}

async function callGemini(prompt: string): Promise<EnhancementResult> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(30_000),
    },
  )
  if (!res.ok) throw new Error(`Gemini API error ${res.status}`)
  const data = await res.json()
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
  return extractJson(text)
}

export async function enhanceWithLLM(skill: string, findings: Finding[]): Promise<EnhancementResult> {
  if (!getProvider()) throw new Error("No LLM provider configured")
  return callGemini(buildPrompt(skill, findings))
}
