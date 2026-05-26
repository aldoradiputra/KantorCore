import 'server-only'
import { getAnthropic } from '../anthropic'
import type { FieldMapping, TargetField } from './types'

export async function suggestMappings(
  sourceHeaders: string[],
  targetFields: TargetField[],
  sampleRows: string[][],  // first 3–5 rows
): Promise<FieldMapping[]> {
  const anthropic = getAnthropic()

  const prompt = {
    sourceHeaders,
    targetFields: targetFields.map((f) => ({ name: f.name, type: f.type, required: f.required })),
    sampleData: sampleRows.slice(0, 5),
  }

  let llmMappings: { source: string; target: string; confidence: number }[] = []

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: `You are a data schema mapping assistant. Given source CSV headers and target schema fields, return a JSON array of mappings.
Return ONLY a JSON array, no other text:
[{"source": "<source_header>", "target": "<target_field_name>", "confidence": 0.0-1.0}]
Rules:
- confidence >= 0.75 means high confidence match
- confidence < 0.75 means uncertain — still include it
- target must be exactly one of the provided targetFields names, or null if no match
- Do not invent target field names`,
      messages: [
        {
          role: 'user',
          content: JSON.stringify(prompt),
        },
      ],
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      llmMappings = JSON.parse(jsonMatch[0])
    }
  } catch (err) {
    console.error('[llm-match] LLM mapping failed, falling back to exact match:', err)
  }

  // Build final mapping list — LLM suggestions merged with exact-match fallback
  const targetNames = new Set(targetFields.map((f) => f.name))
  const result: FieldMapping[] = []

  for (const header of sourceHeaders) {
    // 1. Exact / case-insensitive match
    const exactTarget = targetFields.find(
      (f) => f.name.toLowerCase() === header.toLowerCase()
    )
    if (exactTarget) {
      result.push({ sourceHeader: header, targetField: exactTarget.name, confidence: 1.0, matchType: 'exact' })
      continue
    }

    // 2. LLM suggestion
    const llmMatch = llmMappings.find((m) => m.source === header)
    if (llmMatch && llmMatch.target && targetNames.has(llmMatch.target) && llmMatch.confidence >= 0.75) {
      result.push({ sourceHeader: header, targetField: llmMatch.target, confidence: llmMatch.confidence, matchType: 'ai' })
      continue
    }

    // 3. No match
    result.push({ sourceHeader: header, targetField: null, confidence: llmMatch?.confidence, matchType: 'none' })
  }

  return result
}
