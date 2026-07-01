export function generateRecommendation(
  score: number
) {
  if (score > 80) {
    return "Immediate action required";
  }

  if (score > 50) {
    return "Monitor closely";
  }

  return "Low priority";
}