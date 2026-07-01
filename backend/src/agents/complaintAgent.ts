export async function analyzeComplaint(
  complaint: any
) {
  return {
    category: complaint.category,
    urgency: "Medium",
  };
}