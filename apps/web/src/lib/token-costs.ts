// Ціни Claude API у доларах за токен
const COST_TABLE: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 3 / 1_000_000, output: 15 / 1_000_000 },
  'claude-opus-4-6':   { input: 15 / 1_000_000, output: 75 / 1_000_000 },
  'claude-haiku-4-5-20251001': { input: 0.8 / 1_000_000, output: 4 / 1_000_000 },
}

// tokensCacheWrite: +25% від базової ціни input (cache write overhead)
// tokensCacheRead:  -90% від базової ціни input (кеш-хіт економія)
export function calcCostUsd(
  model: string,
  tokensInput: number,
  tokensOutput: number,
  tokensCacheRead = 0,
  tokensCacheWrite = 0
): number {
  const prices = COST_TABLE[model] ?? COST_TABLE['claude-sonnet-4-6']
  const regularInput = Math.max(0, tokensInput - tokensCacheRead - tokensCacheWrite)
  return (
    prices.input * regularInput +
    prices.input * 1.25 * tokensCacheWrite +
    prices.input * 0.10 * tokensCacheRead +
    prices.output * tokensOutput
  )
}
