export function calculatePriority(
  complaint: any
) {
  let score = 0;

  // Category weights
  switch (complaint.category) {
    case "Health":
      score += 40;
      break;

    case "Water":
      score += 35;
      break;

    case "Electricity":
      score += 30;
      break;

    case "Road":
      score += 25;
      break;

    case "Waste":
      score += 20;
      break;
  }

  // Pending complaints get higher priority
  if (complaint.status === "Pending") {
    score += 20;
  }

  // Long descriptions usually indicate more detail
  if (
    complaint.description.length > 100
  ) {
    score += 15;
  }

  if (score >= 80)
    return {
      score,
      level: "Critical",
    };

  if (score >= 60)
    return {
      score,
      level: "High",
    };

  if (score >= 40)
    return {
      score,
      level: "Medium",
    };

  return {
    score,
    level: "Low",
  };
}