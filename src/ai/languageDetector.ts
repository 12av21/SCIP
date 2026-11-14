// SCIP AI - Multilingual Language Detection (Hindi, English, Hinglish, Mixed)
// Identifies script and language of civic complaint text.
// No external model downloads: pure regex/Unicode-based detection.
// Suitable for lightweight infrastructure with minimal memory footprint.

export type DetectedLanguage = 'hi' | 'en' | 'hinglish' | 'mixed' | 'unknown';

export interface LanguageDetectionResult {
  language: DetectedLanguage;
  confidence: number; // 0 to 1
  scriptCounts: {
    devanagari: number;
    latin: number;
    other: number;
  };
  totalChars: number;
  reasoning: string[];
}

// Devanagari Unicode block: U+0900–U+097F
const DEVANAGARI_RE = /[\u0900-\u097F]/;
// Latin (ASCII letters)
const LATIN_RE = /[a-zA-Z]/;
// Hinglish indicator words (Romanized Hindi commonly used in civic complaints)
const HINGLISH_INDICATORS = [
  'paani', 'pani', 'sadak', 'sarkar', 'nagar', 'nigam', 'ward', 'mohalla',
  'gali', 'chowk', 'pul', 'pulya', 'nala', 'naala', 'kudi', 'kudiya',
  'bijli', 'light', 'streetlight', 'street light', 'transformer',
  'kuda', 'kchra', 'gandagi', 'safai', 'dump', 'dustbin',
  'darwaza', 'deewar', 'imarat', 'makan', 'ghar', 'makaan',
  'bimari', 'beemari', 'dawa', 'hospital', 'clinic',
  'shor', 'shabd', 'loudspeaker', 'construction',
  'police', 'thana', 'tehsil', 'block', 'gram', 'pincode', 'pin code',
  'shikayat', 'complaint', 'problem', 'samasya', 'halat', 'condition',
  'jaldi', 'urgent', 'emergency', 'madad', 'help', 'kripya', 'please',
  'nahi', 'na', 'hai', 'hain', 'tha', 'the', 'ho', 'hoga', 'kar',
  'karna', 'kiye', 'kiya', 'karein', 'kijiye', 'dijiye', 'lein',
  'mere', 'mera', 'meri', 'hamara', 'unka', 'unke', 'iske', 'iske',
  'yahin', 'wahan', 'itihas', 'pura', 'naya', 'purana', 'accha', 'bura',
  'thik', 'theek', 'sahi', 'galat', 'sab', 'koi', 'kuch', 'bahut', 'kam',
  'zyada', 'jyada', 'pekka', 'pakka', 'kachcha', 'nali', 'nallah',
  'gutter', 'manhole', 'culvert', 'bridge', 'pul', 'flyover'
];

// Common Hinglish → English normalization mapping for civic terminology
const HINGLISH_NORMALIZATION: Record<string, string> = {
  'paani': 'water', 'pani': 'water', 'sadak': 'road', 'sarkar': 'government',
  'nagar': 'city', 'nigam': 'municipal corporation', 'ward': 'ward',
  'mohalla': 'neighborhood', 'gali': 'street', 'chowk': 'square',
  'pul': 'bridge', 'nala': 'drain', 'naala': 'drain', 'kuda': 'waste',
  'kchra': 'garbage', 'gandagi': 'dirt', 'safai': 'cleanliness',
  'bijli': 'electricity', 'kuda_kachra': 'trash', 'dustbin': 'bin',
  'shor': 'noise', 'shabd': 'sound', 'shikayat': 'complaint',
  'samasya': 'problem', 'madad': 'help', 'kripya': 'please',
  'jaldi': 'urgent', 'nahi': 'no', 'hai': 'is', 'hain': 'are',
  'meer': 'my', 'mere': 'my', 'hamara': 'our', 'yahin': 'here',
  'wahan': 'there', 'naya': 'new', 'purana': 'old', 'accha': 'good',
  'bura': 'bad', 'thik': 'okay', 'sahi': 'correct', 'galat': 'wrong',
  'sab': 'all', 'koi': 'anyone', 'kuch': 'something', 'bahut': 'much',
  'kam': 'less', 'zyada': 'more', 'jyada': 'more', 'nali': 'drain',
  'nallah': 'drain', 'gutter': 'drain', 'manhole': 'manhole',
  'culvert': 'culvert', 'bridge': 'bridge', 'flyover': 'flyover',
  'hospital': 'hospital', 'clinic': 'clinic', 'police': 'police',
  'thana': 'police station', 'tehsil': 'sub-district', 'block': 'block',
  'gram': 'village', 'pincode': 'pincode', 'pin code': 'pincode'
};

export function detectLanguage(text: string): LanguageDetectionResult {
  const reasoning: string[] = [];

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return {
      language: 'unknown',
      confidence: 0,
      scriptCounts: { devanagari: 0, latin: 0, other: 0 },
      totalChars: 0,
      reasoning: ['Empty or non-string input']
    };
  }

  const trimmed = text.trim();
  const devanagariMatches = trimmed.match(DEVANAGARI_RE);
  const latinMatches = trimmed.match(LATIN_RE);

  const devanagariCount = devanagariMatches ? devanagariMatches.length : 0;
  const latinCount = latinMatches ? latinMatches.length : 0;

  // Count "other" chars (punctuation, digits, symbols, emoji, etc.)
  let otherCount = 0;
  for (const ch of trimmed) {
    if (!DEVANAGARI_RE.test(ch) && !LATIN_RE.test(ch) && !/\s/.test(ch)) {
      otherCount++;
    }
  }
  const totalChars = devanagariCount + latinCount + otherCount;

  const devanagariRatio = totalChars > 0 ? devanagariCount / totalChars : 0;
  const latinRatio = totalChars > 0 ? latinCount / totalChars : 0;

  // Check for Hinglish indicators (Romanized Hindi words in Latin script)
  const lowerText = trimmed.toLowerCase();
  let hinglishIndicatorCount = 0;
  for (const indicator of HINGLISH_INDICATORS) {
    if (lowerText.includes(indicator)) {
      hinglishIndicatorCount++;
    }
  }

  // Determine language
  let language: DetectedLanguage;
  let confidence: number;

  if (devanagariCount > 0 && latinCount > 0) {
    // Mixed script: Devanagari + Latin
    language = 'mixed';
    confidence = Math.min(0.95, 0.6 + (Math.min(devanagariCount, latinCount) / Math.max(devanagariCount, latinCount)) * 0.3);
    reasoning.push(`Both Devanagari (${devanagariCount} chars) and Latin (${latinCount} chars) scripts detected`);
  } else if (devanagariCount > 0 && latinCount === 0) {
    // Pure Hindi (Devanagari only)
    language = 'hi';
    confidence = Math.min(0.98, 0.7 + devanagariRatio * 0.28);
    reasoning.push(`Pure Devanagari script detected (${devanagariCount} chars)`);
  } else if (latinCount > 0 && devanagariCount === 0) {
    // Latin script only: could be English or Hinglish
    if (hinglishIndicatorCount >= 2) {
      language = 'hinglish';
      confidence = Math.min(0.9, 0.55 + Math.min(hinglishIndicatorCount, 5) * 0.07);
      reasoning.push(`Hinglish indicators detected: ${hinglishIndicatorCount} Romanized Hindi words`);
    } else {
      language = 'en';
      confidence = Math.min(0.95, 0.7 + latinRatio * 0.25);
      reasoning.push(`Latin script with no Hinglish indicators; classified as English`);
    }
  } else {
    // No recognizable script
    language = 'unknown';
    confidence = 0;
    reasoning.push('No Devanagari or Latin script characters detected');
  }

  return {
    language,
    confidence: Number(confidence.toFixed(2)),
    scriptCounts: { devanagari: devanagariCount, latin: latinCount, other: otherCount },
    totalChars,
    reasoning
  };
}

export function normalizeHinglish(text: string): string {
  if (!text) return '';
  let normalized = text;
  for (const [hinglish, english] of Object.entries(HINGLISH_NORMALIZATION)) {
    const regex = new RegExp(`\\b${hinglish.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    normalized = normalized.replace(regex, english);
  }
  return normalized;
}

export function isHinglishCandidate(text: string): boolean {
  const result = detectLanguage(text);
  return result.language === 'hinglish' || result.language === 'mixed';
}

export function getLanguageDisplayName(language: DetectedLanguage): string {
  const names: Record<DetectedLanguage, string> = {
    hi: 'Hindi (Devanagari)',
    en: 'English',
    hinglish: 'Hinglish (Romanized Hindi)',
    mixed: 'Mixed Hindi-English',
    unknown: 'Unknown'
  };
  return names[language];
}

export const languageDetector = {
  detectLanguage,
  normalizeHinglish,
  isHinglishCandidate,
  getLanguageDisplayName
};
