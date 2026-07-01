export function calculateRisk(
  complaints: number,
  pending: number
) {
  return complaints * 5 + pending * 2;
}