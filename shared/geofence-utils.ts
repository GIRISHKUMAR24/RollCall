/**
 * Haversine formula — returns distance between two GPS points in metres.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371e3; // Earth radius in metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export type DistanceClassification = "VERY_NEAR" | "NEAR" | "VERIFY" | "SUSPICIOUS";

export interface ValidationResult {
  status: "Present" | "Absent" | "Needs Verification";
  classification: DistanceClassification;
  distance: number;
  confidence: "High" | "Medium" | "Low";
  reason: string;
  badge: "green" | "yellow" | "red";
}

/**
 * Classify distance and determine status/confidence.
 * 0–20m: VERY_NEAR -> Auto Present (Green)
 * 20–40m: NEAR -> Present (Green/Yellow)
 * 40–60m: VERIFY -> Needs Verification (Yellow)
 * 60m+: SUSPICIOUS -> Default Absent (Red)
 */
export function classifyAttendance(
  distance: number,
  accuracy: number,
  stabilityScore: number = 1.0 // 0.0 to 1.0
): ValidationResult {
  // Accuracy Compensation: If accuracy is poor, we can slightly relax the radius,
  // but we also lower the confidence.
  const accuracyCompensation = Math.min(accuracy * 0.5, 20); // Max 20m compensation
  const effectiveDistance = Math.max(0, distance - accuracyCompensation);

  let classification: DistanceClassification;
  let status: "Present" | "Absent" | "Needs Verification";
  let badge: "green" | "yellow" | "red";
  let reason: string;

  if (distance <= 20) {
    classification = "VERY_NEAR";
    status = "Present";
    badge = "green";
    reason = "Student is well within the immediate classroom zone.";
  } else if (distance <= 40) {
    classification = "NEAR";
    status = "Present";
    badge = "green";
    reason = "Student is within a reasonable classroom range.";
  } else if (distance <= 60) {
    classification = "VERIFY";
    status = "Needs Verification";
    badge = "yellow";
    reason = "Student is on the edge of the classroom. Requires teacher confirmation.";
  } else {
    classification = "SUSPICIOUS";
    status = "Absent";
    badge = "red";
    reason = "Student is significantly outside the classroom range.";
  }

  // Calculate Confidence Score
  // Factors: 
  // - Accuracy (lower is better, <10m is great)
  // - Stability (higher is better)
  // - Distance (closer is better)
  
  let confidenceScore = 0;
  if (accuracy <= 10) confidenceScore += 40;
  else if (accuracy <= 30) confidenceScore += 25;
  else if (accuracy <= 60) confidenceScore += 10;

  if (stabilityScore >= 0.9) confidenceScore += 30;
  else if (stabilityScore >= 0.7) confidenceScore += 20;
  else if (stabilityScore >= 0.5) confidenceScore += 10;

  if (distance <= 20) confidenceScore += 30;
  else if (distance <= 40) confidenceScore += 20;
  else if (distance <= 60) confidenceScore += 10;

  let confidence: "High" | "Medium" | "Low";
  if (confidenceScore >= 80) confidence = "High";
  else if (confidenceScore >= 50) confidence = "Medium";
  else confidence = "Low";

  return {
    status,
    classification,
    distance: Math.round(distance),
    confidence,
    reason,
    badge
  };
}
