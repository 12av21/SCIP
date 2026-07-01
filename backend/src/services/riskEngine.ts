export function calculateRiskScores(
  complaints: any[]
) {
  const areaMap: Record<string, any> = {};

  complaints.forEach((complaint) => {
    const area = complaint.location;

    if (!areaMap[area]) {
      areaMap[area] = {
        area,
        complaints: 0,
        pending: 0,
      };
    }

    areaMap[area].complaints++;

    if (
      complaint.status === "Pending"
    ) {
      areaMap[area].pending++;
    }
  });

  return Object.values(areaMap).map(
    (item: any) => {
      const riskScore =
        item.complaints * 5 +
        item.pending * 2;

      return {
        ...item,
        riskScore,

        level:
          riskScore > 50
            ? "High"
            : riskScore > 20
            ? "Medium"
            : "Low",
      };
    }
  );
}