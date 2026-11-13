/**
 * Computes Dynamic Priority Score for civic defect tickets
 * Score = (w1 * Severity) + (w2 * log2(Reports + 1)) + (w3 * TrafficIndex) + (w4 * AgeInDays)
 */
export function calculatePriorityScore({
  severityLevel = 'MEDIUM',
  reportCount = 1,
  trafficDensityRating = 3,
  createdAt = new Date(),
}) {
  // Severity Weights
  const severityMap = {
    CRITICAL: 40,
    HIGH: 30,
    MEDIUM: 20,
    LOW: 10,
  };

  const baseSeverityScore = severityMap[severityLevel] || 20;

  // Logarithmic Report Count dampener: w2 = 12
  // log2(1 + 1) = 1 -> 12
  // log2(5 + 1) = 2.58 -> 31
  // log2(20 + 1) = 4.39 -> 52.7
  const reportWeight = 12;
  const reportScore = reportWeight * Math.log2(Math.max(1, reportCount) + 1);

  // Traffic Density Index (1 to 5): w3 = 6
  // Score contribution: 6 to 30
  const trafficWeight = 6;
  const trafficScore = trafficWeight * Math.min(5, Math.max(1, trafficDensityRating));

  // Age in Days: w4 = 2 points per day unaddressed
  const ageInDays = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  const ageScore = Math.min(25, ageInDays * 2.5); // capped at 25 points

  const totalScore = Math.round(baseSeverityScore + reportScore + trafficScore + ageScore);
  return totalScore;
}
