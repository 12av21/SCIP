// SCIP AI/ML Foundation - Classification & Entity Extraction Engine
// Supervised centroid-based TF-IDF classifier and domain entity extractor

import { ReportCategory, UrgencyLevel } from '../types/scip';
import { globalVectorizer, DocumentVector } from './tfidf';

interface CategoryProfile {
  category: ReportCategory;
  representativeTerms: string[];
  weight: number;
}

const CATEGORY_PROFILES: CategoryProfile[] = [
  {
    category: 'Water & Drainage',
    representativeTerms: [
      'water', 'drain', 'drainage', 'sewer', 'sewage', 'flooding', 'flood',
      'overflow', 'pipe', 'leakage', 'leak', 'clogged', 'blocked', 'gutter',
      'culvert', 'stormwater', 'manhole', 'stagnant', 'puddle', 'contamination'
    ],
    weight: 1.2
  },
  {
    category: 'Roads & Traffic',
    representativeTerms: [
      'road', 'traffic', 'pothole', 'signal', 'light', 'jam', 'congestion',
      'asphalt', 'divider', 'sidewalk', 'speed', 'breaker', 'vehicle', 'accident',
      'pedestrian', 'crossing', 'lane', 'intersection', 'surface', 'crater'
    ],
    weight: 1.0
  },
  {
    category: 'Public Sanitation',
    representativeTerms: [
      'garbage', 'waste', 'trash', 'dump', 'dumping', 'bin', 'litter',
      'smell', 'odor', 'stench', 'debris', 'sanitary', 'cleanliness',
      'sweeping', 'overflowing', 'rotting', 'plastic', 'refuse', 'spillage'
    ],
    weight: 1.3
  },
  {
    category: 'Power & Lighting',
    representativeTerms: [
      'power', 'electricity', 'wire', 'cable', 'transformer', 'pole', 'blackout',
      'outage', 'streetlight', 'lamp', 'dark', 'sparking', 'hanging', 'voltage',
      'meter', 'grid', 'current', 'shock'
    ],
    weight: 1.1
  },
  {
    category: 'Parks & Environment',
    representativeTerms: [
      'tree', 'branch', 'fallen', 'park', 'grass', 'bench', 'playground',
      'garden', 'pruning', 'overgrown', 'foliage', 'greenery', 'plant', 'lake',
      'pond', 'birds', 'wildlife'
    ],
    weight: 0.9
  },
  {
    category: 'Structural Safety',
    representativeTerms: [
      'building', 'wall', 'crack', 'collapse', 'ceiling', 'bridge', 'railing',
      'scaffolding', 'pillar', 'structure', 'hazardous', 'dilapidated', 'unstable',
      'brick', 'concrete', 'foundation'
    ],
    weight: 1.2
  },
  {
    category: 'Public Health',
    representativeTerms: [
      'mosquito', 'breeding', 'disease', 'dengue', 'malaria', 'rodent', 'rat',
      'infestation', 'stray', 'dog', 'bite', 'dead', 'animal', 'hygiene',
      'hazardous', 'medical', 'waste'
    ],
    weight: 1.0
  },
  {
    category: 'Noise & Disturbance',
    representativeTerms: [
      'noise', 'loudspeaker', 'music', 'sound', 'decibel', 'construction',
      'night', 'disturbance', 'generator', 'honking', 'nuisance', 'industrial'
    ],
    weight: 0.8
  }
];

const KNOWN_INFRASTRUCTURE = [
  'drain', 'drainage', 'storm drain', 'sewer', 'manhole', 'culvert', 'pipe',
  'water pipe', 'traffic light', 'traffic signal', 'sidewalk', 'pavement', 'footpath',
  'speed bump', 'transformer', 'electric pole', 'streetlight', 'power line', 'wire',
  'cable', 'transformer box', 'garbage bin', 'waste container', 'bridge', 'overpass',
  'flyover', 'building wall', 'compound wall', 'railing', 'water tanker', 'pipeline',
  'substation', 'live wire', 'sparking wire'
];

const KNOWN_LOCATIONS = [
  'sector 4 market', 'sector 4', 'sector 7', 'sector 12', 'west boulevard',
  'north industrial park', 'river road', 'riverfront', 'central plaza', 'railway road',
  'station square', 'green park avenue', 'hospital road', 'metro station',
  'commercial hub', 'old city gate', 'ring road junction', 'school road',
  'civic center', 'sub-city sector 9'
];

// Infrastructure terms that should NOT be matched standalone (too broad / false positives).
// They are still valid as part of longer phrases already in KNOWN_INFRASTRUCTURE.
const INFRASTRUCTURE_EXCLUSIONS = new Set(['road', 'street', 'highway', 'lane']);

// Hindi civic infrastructure terms (Devanagari) mapped to English equivalents.
const HINDI_INFRASTRUCTURE_TERMS: Record<string, string> = {
  'नाली': 'drain',
  'नाला': 'drain',
  'गटर': 'gutter',
  'सीवर': 'sewer',
  'पुल': 'bridge',
  'सड़क': 'road',
  'फुटपाथ': 'footpath',
  'चौराहा': 'intersection',
  'बाजार': 'market'
};

// Hindi civic location terms (Devanagari).
const HINDI_LOCATION_TERMS: Record<string, string> = {
  'यहाँ': 'here',
  'वहाँ': 'there',
  'पास': 'near',
  'गली': 'street',
  'मोहल्ला': 'neighborhood',
  'चौक': 'square',
  'पार्क': 'park',
  'स्कूल': 'school',
  'अस्पताल': 'hospital',
  'बाजार': 'market'
};

// Hindi civic hazard terms (Devanagari).
const HINDI_HAZARD_TERMS: Record<string, string> = {
  'बाढ़': 'flooding',
  'दरार': 'crack',
  'ढहना': 'collapse',
  'जलभराव': 'waterlogging',
  'गंदगी': 'dirt',
  'कूड़ा': 'garbage',
  'कचरा': 'waste'
};

/**
 * Normalize text for entity matching: lowercase, collapse whitespace, strip zero-width chars.
 */
function normalizeEntityText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\u200B|\u200C|\u200D|\uFEFF/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if a candidate infrastructure term would be a false positive (standalone broad term).
 */
function isInfrastructureFalsePositive(term: string, lowerText: string): boolean {
  if (INFRASTRUCTURE_EXCLUSIONS.has(term)) {
    // Only match if it appears as part of a longer, more specific phrase
    const longerPhrases = [
      `${term} light`, `${term} signal`, `${term} surface`, `${term} divider`,
      `${term} junction`, `${term} block`, `main ${term}`, `${term} side`
    ];
    return !longerPhrases.some(p => lowerText.includes(p));
  }
  return false;
}

const HAZARD_TERMS = [
  'flooding', 'deep water', 'stalled vehicle', 'open manhole', 'live wire',
  'electric shock hazard', 'sparking wire', 'gas smell', 'building collapse',
  'deep pothole', 'severe accident risk', 'falling tree', 'structural crack',
  'uncontrolled sewage', 'chemical smell', 'toxic waste', 'blocked emergency route'
];

const TEMPORAL_PATTERNS = [
  'today', 'yesterday', 'this morning', 'last night', 'since morning',
  'past 2 hours', 'past 3 days', 'continuous', 'every monsoon', 'heavy rain',
  'peak hours', 'night time'
];

/**
 * Disambiguation rules for overlapping category terms.
 * These resolve cases where keyword overlap causes misclassification.
 * Each rule returns an override category and a confidence adjustment.
 */
const DISAMBIGUATION_RULES: Array<{
  test: (text: string, scores: { category: ReportCategory; score: number }[]) => { category: ReportCategory; confidenceAdjustment: number } | null;
  reason: string;
}> = [
  // Garbage/waste + animals/rodents → Public Sanitation (not Public Health)
  {
    test: (text, scores) => {
      const lower = text.toLowerCase();
      const hasGarbage = /garbage|waste|trash|refuse|dump|bin|litter|spillage/.test(lower);
      const hasAnimal = /stray|dog|rodent|rat|animal|carcass|infestation/.test(lower);
      if (hasGarbage && hasAnimal) {
        const ps = scores.find(s => s.category === 'Public Sanitation');
        if (ps) return { category: 'Public Sanitation', confidenceAdjustment: 0.05 };
      }
      return null;
    },
    reason: 'Garbage/waste terms combined with animal terms indicate Public Sanitation, not Public Health.'
  },
  // Sewage/drainage + disease → Water & Drainage (not Public Health) when drain/sewer present
  {
    test: (text, scores) => {
      const lower = text.toLowerCase();
      const hasDrainage = /sewer|sewage|drain|drainage|clogged|blocked|culvert/.test(lower);
      const hasHealth = /disease|dengue|malaria|outbreak|epidemic/.test(lower);
      if (hasDrainage && hasHealth) {
        const wd = scores.find(s => s.category === 'Water & Drainage');
        if (wd) return { category: 'Water & Drainage', confidenceAdjustment: 0.03 };
      }
      return null;
    },
    reason: 'Drainage/sewer terms combined with disease terms indicate Water & Drainage infrastructure issue, not primary Public Health.'
  }
];

/**
 * Supervised Classification: Scores text against Category TF-IDF profiles.
 * Returns explainable evidence including score gaps and disambiguation applied.
 */
export function classifyReport(
  text: string,
  declaredCategory?: ReportCategory
): {
  predictedCategory: ReportCategory;
  confidence: number;
  allScores: { category: ReportCategory; score: number }[];
  topScore: number;
  secondScore: number;
  scoreGap: number;
  disambiguationApplied: string[];
} {
  const docVec = globalVectorizer.transform(text);

  const scores: { category: ReportCategory; score: number }[] = [];

  for (const profile of CATEGORY_PROFILES) {
    const profileText = profile.representativeTerms.join(' ');
    const profileVec = globalVectorizer.transform(profileText);
    const rawSim = globalVectorizer.cosineSimilarity(docVec, profileVec);
    const weightedScore = rawSim * profile.weight;
    scores.push({ category: profile.category, score: weightedScore });
  }

  scores.sort((a, b) => b.score - a.score);

  const topScore = scores[0].score;
  const secondScore = scores[1]?.score ?? 0;
  const scoreGap = topScore - secondScore;

  // Disambiguation: apply rules that override category choice based on text context
  const disambiguationApplied: string[] = [];
  let top = scores[0];
  let confidenceAdjustment = 0;

  for (const rule of DISAMBIGUATION_RULES) {
    const result = rule.test(text, scores);
    if (result) {
      top = result.category === top.category ? top : scores.find(s => s.category === result.category) ?? top;
      confidenceAdjustment += result.confidenceAdjustment;
      disambiguationApplied.push(rule.reason);
    }
  }

  // If citizen manually selected category and it has reasonable score, factor it in
  if (declaredCategory) {
    const declaredMatch = scores.find(s => s.category === declaredCategory);
    if (declaredMatch && declaredMatch.score > 0.15) {
      top = declaredMatch;
      confidenceAdjustment += 0.1;
      disambiguationApplied.push(`Declared category '${declaredCategory}' used as override.`);
    }
  }

  // Confidence calibration: base on score separation (gap between top and second-best)
  // Range: 0.50 (no separation) to 0.90 (strong separation)
  const gapConfidence = Math.min(0.90, Math.max(0.50, 0.50 + scoreGap * 2.0));
  let confidence = Math.min(0.96, Math.max(0.50, gapConfidence + confidenceAdjustment));

  return {
    predictedCategory: top.category,
    confidence: Number(confidence.toFixed(2)),
    allScores: scores.map(s => ({ category: s.category, score: Number(s.score.toFixed(3)) })),
    topScore: Number(topScore.toFixed(3)),
    secondScore: Number(secondScore.toFixed(3)),
    scoreGap: Number(scoreGap.toFixed(3)),
    disambiguationApplied
  };
}

/**
 * Entity Extraction: Extracts municipal domain entities from text.
 * Uses normalized phrase matching to catch stem variants (e.g., "drainage" → "drain").
 * Preserves the existing response structure: locations, infrastructure, hazards, temporal.
 */
export function extractEntities(text: string): {
  locations: string[];
  infrastructure: string[];
  hazards: string[];
  temporal: string[];
} {
  const lower = normalizeEntityText(text);

  const locations: string[] = [];
  for (const loc of KNOWN_LOCATIONS) {
    if (lower.includes(loc)) {
      locations.push(loc.replace(/\b\w/g, c => c.toUpperCase()));
    }
  }
  // Hindi location terms
  for (const [hiTerm, enTerm] of Object.entries(HINDI_LOCATION_TERMS)) {
    if (text.includes(hiTerm) || lower.includes(enTerm)) {
      if (!locations.includes(enTerm)) locations.push(enTerm);
    }
  }

  const infrastructure: string[] = [];
  for (const inf of KNOWN_INFRASTRUCTURE) {
    const infLower = inf.toLowerCase();
    if (lower.includes(infLower)) {
      if (isInfrastructureFalsePositive(infLower, lower)) continue;
      infrastructure.push(inf);
    }
  }
  // Hindi infrastructure terms
  for (const [hiTerm, enTerm] of Object.entries(HINDI_INFRASTRUCTURE_TERMS)) {
    if (text.includes(hiTerm)) {
      if (!infrastructure.includes(enTerm)) infrastructure.push(enTerm);
    }
  }

  const hazards: string[] = [];
  for (const haz of HAZARD_TERMS) {
    if (lower.includes(haz.toLowerCase())) {
      hazards.push(haz);
    }
  }
  // Hindi hazard terms
  for (const [hiTerm, enTerm] of Object.entries(HINDI_HAZARD_TERMS)) {
    if (text.includes(hiTerm)) {
      if (!hazards.includes(enTerm)) hazards.push(enTerm);
    }
  }

  const temporal: string[] = [];
  for (const temp of TEMPORAL_PATTERNS) {
    if (lower.includes(temp)) {
      temporal.push(temp);
    }
  }

  return {
    locations: Array.from(new Set(locations)),
    infrastructure: Array.from(new Set(infrastructure)),
    hazards: Array.from(new Set(hazards)),
    temporal: Array.from(new Set(temporal))
  };
}

/**
 * Urgency/Severity Indicator based on hazard keywords and language intensity.
 */
export function determineSeverity(text: string, urgencyDeclared?: UrgencyLevel): UrgencyLevel {
  const lower = text.toLowerCase();

  const criticalKeywords = ['live wire', 'collapse', 'sparking', 'gas leak', 'gas smell', 'major flood', 'electrocution', 'severe injury', 'blocked ambulance'];
  const highKeywords = ['flooded road', 'submerged', 'stalled vehicle', 'open manhole', 'burst pipe', 'overflowing sewage', 'heavy congestion', 'fallen tree blocking'];
  const mediumKeywords = ['pothole', 'broken light', 'garbage piled', 'water logging', 'slow traffic', 'foul smell'];

  for (const kw of criticalKeywords) {
    if (lower.includes(kw)) return 'critical';
  }
  for (const kw of highKeywords) {
    if (lower.includes(kw)) return 'high';
  }
  if (urgencyDeclared === 'critical') return 'critical';
  if (urgencyDeclared === 'high') return 'high';

  for (const kw of mediumKeywords) {
    if (lower.includes(kw)) return 'medium';
  }

  return urgencyDeclared || 'low';
}
