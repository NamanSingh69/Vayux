export interface PolicySimulationInput {
  baseline_aqi: number;
  baseline_pm25?: number;
  vehicular?: number;
  stubble?: number;
  industrial?: number;
  dust?: number;
}

export interface PolicySimulationOutput {
  baseline_aqi: number;
  simulated_aqi: number;
  aqi_reduction: number;
  baseline_pm25: number;
  simulated_pm25: number;
  percentage_improvement: number;
}

export const DEFAULT_SOURCE_PROFILES = {
  vehicular: 0.28,
  stubble: 0.35,
  industrial: 0.18,
  dust: 0.12,
  secondary_background: 0.07,
} as const;

export function simulatePolicyImpact(input: PolicySimulationInput): PolicySimulationOutput {
  const baselineAqi = Math.max(input.baseline_aqi, 1);
  const baselinePm25 = input.baseline_pm25 ?? Math.max(baselineAqi * 0.75, 10.0);
  const vehicularScale = input.vehicular ?? 1.0;
  const stubbleScale = input.stubble ?? 1.0;
  const industrialScale = input.industrial ?? 1.0;
  const dustScale = input.dust ?? 1.0;

  const mitigatedPm25 = baselinePm25 * (
    DEFAULT_SOURCE_PROFILES.secondary_background +
    (DEFAULT_SOURCE_PROFILES.vehicular * vehicularScale) +
    (DEFAULT_SOURCE_PROFILES.stubble * stubbleScale) +
    (DEFAULT_SOURCE_PROFILES.industrial * industrialScale) +
    (DEFAULT_SOURCE_PROFILES.dust * dustScale)
  );

  const pm25DeltaRatio = mitigatedPm25 / Math.max(baselinePm25, 1.0);
  const feedbackBonus = 1.0 - (0.08 * (1.0 - pm25DeltaRatio));
  const finalPm25 = Math.max(mitigatedPm25 * feedbackBonus, 5.0);

  const aqiDelta = (finalPm25 / Math.max(baselinePm25, 1.0)) * baselineAqi;
  const simulatedAqi = Math.max(Math.round(aqiDelta), 15);
  const aqiReduction = baselineAqi - simulatedAqi;
  const percentageImprovement = Number((((baselineAqi - simulatedAqi) / baselineAqi) * 100).toFixed(1));

  return {
    baseline_aqi: baselineAqi,
    simulated_aqi: simulatedAqi,
    aqi_reduction: aqiReduction,
    baseline_pm25: Number(baselinePm25.toFixed(1)),
    simulated_pm25: Number(finalPm25.toFixed(1)),
    percentage_improvement: percentageImprovement,
  };
}
