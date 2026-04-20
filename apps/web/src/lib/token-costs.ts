// Ціни Claude API у доларах за токен
const COST_TABLE: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 3 / 1_000_000, output: 15 / 1_000_000 },
  'claude-opus-4-6':   { input: 15 / 1_000_000, output: 75 / 1_000_000 },
  'claude-haiku-4-5-20251001': { input: 0.8 / 1_000_000, output: 4 / 1_000_000 },
}

export function calcCostUsd(model: string, tokensInput: number, tokensOutput: number): number {
  const prices = COST_TABLE[model] ?? COST_TABLE['claude-sonnet-4-6']
  return prices.input * tokensInput + prices.output * tokensOutput
}
