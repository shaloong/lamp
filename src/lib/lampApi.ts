type LampApi = typeof window.lampAPI

export function getLampAPI(): LampApi | null {
  const api = window.lampAPI
  if (!api) {
    console.warn('lampAPI is unavailable')
    return null
  }
  return api
}

export function requireLampAPI(context = 'operation'): LampApi {
  const api = getLampAPI()
  if (!api) {
    throw new Error(`lampAPI is unavailable during ${context}`)
  }
  return api
}
