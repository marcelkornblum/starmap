export type ConfidenceLevel =
  | 'confirmed'
  | 'candidate'
  | 'theoretical'
  | 'projected'
  | 'unverified'
  | 'high'
  | 'medium'
  | 'moderate'
  | 'low';

export function normalizeConfidence(confidence: ConfidenceLevel): {
  canonical: 'confirmed' | 'candidate' | 'theoretical' | 'unverified';
  defaultLabel: string;
} {
  switch (confidence) {
    case 'confirmed':
    case 'high':
      return { canonical: 'confirmed', defaultLabel: 'Confirmed' };
    case 'candidate':
    case 'medium':
    case 'moderate':
      return { canonical: 'candidate', defaultLabel: 'Candidate' };
    case 'theoretical':
    case 'projected':
    case 'low':
      return { canonical: 'theoretical', defaultLabel: 'Theoretical' };
    case 'unverified':
    default:
      return { canonical: 'unverified', defaultLabel: 'Unverified' };
  }
}
