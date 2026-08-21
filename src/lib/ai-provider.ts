import { getSetting, setSetting } from './settings'

/**
 * AI Provider wrapper — Groq by default (fast + cheap), OpenRouter optional.
 *
 * Priority for API key:
 *   1. DB Setting `ai_api_key` (configured in Settings UI)
 *   2. Env var GROQ_API_KEY (set in Netlify/CI)
 *
 * Priority for provider:
 *   1. DB Setting `ai_provider` (configured in Settings UI)
 *   2. Env var AI_PROVIDER
 *   3. Default: 'groq'
 *
 * Priority for model:
 *   1. DB Setting `ai_model`
 *   2. Env var AI_MODEL
 *   3. Provider default (Groq: gpt-oss-120b)
 */

export type AIProvider = 'groq' | 'openrouter' | 'zai'

interface GenerateEmailParams {
  leadFirstName?: string
  leadLastName?: string
  leadCompany?: string
  leadTitle?: string
  leadWebsite?: string
  icp?: string
  promptContext?: string
  systemInstruction?: string
  campaignName?: string
}

interface GenerateFollowupParams {
  originalSubject: string
  originalBody: string
  step: number // 1, 2, or 3
  icp?: string
  promptContext?: string
  systemInstruction?: string
}

interface QualifyLeadParams {
  leadEmail: string
  leadFirstName?: string
  leadLastName?: string
  leadCompany?: string
  leadTitle?: string
  leadWebsite?: string
  icp?: string
}

const PROVIDER_DEFAULT: AIProvider = 'groq'
const MODEL_DEFAULTS: Record<AIProvider, string> = {
  groq: 'gpt-oss-120b',
  openrouter: 'meta-llama/llama-3.3-70b-instruct',
  zai: 'gpt-4o-mini',
}

async function getAIConfig(): Promise<{ provider: AIProvider; apiKey: string; model: string }> {
  // DB settings take priority (user can change in Settings UI)
  const dbProvider = await getSetting('ai_provider')
  const dbApiKey = await getSetting('ai_api_key')
  const dbModel = await getSetting('ai_model')

  // Env var fallbacks (for CI / Netlify deploy)
  const envProvider = process.env.AI_PROVIDER as AIProvider | undefined
  const envGroqKey = process.env.GROQ_API_KEY
  const envOpenRouterKey = process.env.OPENROUTER_API_KEY
  const envModel = process.env.AI_MODEL

  const provider = (dbProvider || envProvider || PROVIDER_DEFAULT) as AIProvider

  // Pick the right API key for the provider
  let apiKey = ''
  if (dbApiKey) {
    apiKey = dbApiKey
  } else if (provider === 'groq' && envGroqKey) {
    apiKey = envGroqKey
  } else if (provider === 'openrouter' && envOpenRouterKey) {
    apiKey = envOpenRouterKey
  }

  // Model resolution
  const model =
    dbModel ||
    envModel ||
    MODEL_DEFAULTS[provider] ||
    MODEL_DEFAULTS.groq

  return { provider, apiKey, model }
}

function getApiBaseUrl(provider: AIProvider): string {
  switch (provider) {
    case 'openrouter':
      return 'https://openrouter.ai/api/v1'
    case 'zai':
      return 'https://api.openai.com/v1'
    case 'groq':
    default:
      return 'https://api.groq.com/openai/v1'
  }
}

async function callAI(prompt: string, systemPrompt: string): Promise<string> {
  const { provider, apiKey, model } = await getAIConfig()

  if (!apiKey) {
    throw new Error(
      `No API key configured for AI provider "${provider}". ` +
      `Set GROQ_API_KEY env var (or configure it in Settings → AI Provider).`
    )
  }

  const baseUrl = getApiBaseUrl(provider)

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      ...(provider === 'openrouter'
        ? { 'HTTP-Referer': 'https://senderx.app', 'X-Title': 'SenderX' }
        : {}),
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`AI API error (${response.status}): ${error}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

/**
 * Generate a personalized sniper email for a lead
 */
export async function generateEmail(params: GenerateEmailParams): Promise<{
  subject: string
  greeting: string
  body: string
  cta: string
  signature: string
}> {
  const systemPrompt = params.systemInstruction || `You are an expert cold email writer for B2B outreach. Write concise, personalized, and compelling emails. Never use generic templates. Always reference specific details about the recipient's company or role. Keep emails short (under 150 words). Use a professional but warm tone. Always respond with valid JSON.`

  const userPrompt = `Write a cold email to ${params.leadFirstName || 'there'} ${params.leadLastName || ''} at ${params.leadCompany || 'their company'}.

Role: ${params.leadTitle || 'professional'}
Website: ${params.leadWebsite || 'N/A'}
ICP: ${params.icp || 'B2B decision makers'}
Additional context: ${params.promptContext || ''}

Return ONLY a JSON object with these fields (no markdown, no code fences):
{
  "subject": "compelling subject line under 50 chars",
  "greeting": "personalized greeting line",
  "body": "main email body, 2-3 short paragraphs",
  "cta": "call to action sentence",
  "signature": "professional sign-off"
}`

  const result = await callAI(userPrompt, systemPrompt)

  try {
    const cleaned = result.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return {
      subject: parsed.subject || 'Quick question',
      greeting: parsed.greeting || `Hi ${params.leadFirstName || 'there'},`,
      body: parsed.body || '',
      cta: parsed.cta || 'Would you be open to a quick chat?',
      signature: parsed.signature || 'Best regards',
    }
  } catch {
    return {
      subject: 'Quick question',
      greeting: `Hi ${params.leadFirstName || 'there'},`,
      body: result,
      cta: 'Would you be open to a quick chat?',
      signature: 'Best regards',
    }
  }
}

/**
 * Generate a follow-up template (shared across leads in a campaign)
 */
export async function generateFollowupTemplate(params: GenerateFollowupParams): Promise<string> {
  const systemPrompt = params.systemInstruction || `You are an expert follow-up email writer for B2B cold outreach. Write concise, value-driven follow-ups that reference the previous email but add new value. Keep under 100 words. Use {{firstName}}, {{company}}, {{lastName}} as template variables.`

  const userPrompt = `Write follow-up #${params.step} for this cold email thread:

Original subject: ${params.originalSubject}
Original body: ${params.originalBody}

This is follow-up #${params.step} of 3.
ICP: ${params.icp || 'B2B decision makers'}
Additional context: ${params.promptContext || ''}

Use template variables: {{firstName}}, {{company}}, {{lastName}}.
Return only the follow-up body text, no JSON, no markdown.`

  return callAI(userPrompt, systemPrompt)
}

/**
 * Qualify a lead against ICP using AI
 */
export async function qualifyLead(params: QualifyLeadParams): Promise<{
  score: number
  reason: string
}> {
  const systemPrompt = `You are an ICP qualification expert. Score leads from 0-100 based on how well they match the Ideal Customer Profile. Always respond with valid JSON only.`

  const userPrompt = `Qualify this lead against the ICP:

Email: ${params.leadEmail}
Name: ${params.leadFirstName || ''} ${params.leadLastName || ''}
Company: ${params.leadCompany || 'Unknown'}
Title: ${params.leadTitle || 'Unknown'}
Website: ${params.leadWebsite || 'Unknown'}
ICP: ${params.icp || 'B2B decision makers'}

Return ONLY a JSON object (no markdown):
{ "score": 0-100, "reason": "brief explanation" }`

  const result = await callAI(userPrompt, systemPrompt)

  try {
    const cleaned = result.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return {
      score: Math.min(100, Math.max(0, Number(parsed.score) || 0)),
      reason: parsed.reason || 'No reason provided',
    }
  } catch {
    return { score: 50, reason: 'Could not parse AI response' }
  }
}

/**
 * Test AI provider connection
 */
export async function testConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const result = await callAI('Say "OK" if you can read this.', 'You are a test assistant. Respond with OK.')
    return { ok: result.toLowerCase().includes('ok') }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Get current AI config (for Settings UI)
 */
export async function getCurrentConfig(): Promise<{
  provider: AIProvider
  apiKey: string
  model: string
  hasKey: boolean
}> {
  const config = await getAIConfig()
  return {
    provider: config.provider,
    apiKey: config.apiKey,
    model: config.model,
    hasKey: !!config.apiKey,
  }
}

/**
 * Save AI config (from Settings UI)
 */
export async function saveAIConfig(params: {
  provider?: AIProvider
  apiKey?: string
  model?: string
}): Promise<void> {
  if (params.provider) await setSetting('ai_provider', params.provider)
  if (params.apiKey) await setSetting('ai_api_key', params.apiKey)
  if (params.model) await setSetting('ai_model', params.model)
}