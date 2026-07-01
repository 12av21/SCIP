export function generateRecommendations(
  risks: any[]
) {
  if (!risks.length) {
    return [
      "No complaints available."
    ];
  }

  const sorted = [...risks].sort(
    (a, b) =>
      b.riskScore - a.riskScore
  );

  const highest = sorted[0];

  const recommendations = [];

  recommendations.push(
    `${highest.area} requires immediate attention with a risk score of ${highest.riskScore}.`
  );

  if (
    highest.level === "High"
  ) {
    recommendations.push(
      "Deploy emergency response and maintenance teams."
    );
  }

  recommendations.push(
    "Increase monitoring in high complaint areas."
  );

  recommendations.push(
    "Allocate additional resources to unresolved issues."
  );

  return recommendations;
}