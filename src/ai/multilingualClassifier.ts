// SCIP AI - Multilingual Classifier (Hindi, English, Hinglish)
// Extends the existing TF-IDF centroid classifier with language-aware
// preprocessing and civic terminology recognition for Indian civic complaints.
// No sentence-transformers integration: avoids model downloads and excessive memory.
// Falls back to the existing local TF-IDF classifier when language-specific
// signals are insufficient.

import {
  ReportCategory,
  UrgencyLevel
} from '../types/scip.js';
import { classifyReport, extractEntities, determineSeverity } from './classifier.js';
import { detectLanguage, normalizeHinglish, DetectedLanguage } from './languageDetector.js';
import { preprocessMultilingualText, extractCivicKeywords, extractUrgencyIndicators, extractLocationIndicators } from './hindiPreprocessor.js';
import { globalVectorizer } from './tfidf.js';

// Category keywords in Hindi (Devanagari) and Hinglish (Romanized)
// Maps category → language-specific terms for boosting classification confidence
const CATEGORY_HINDI_KEYWORDS: Record<ReportCategory, { hi: string[]; hinglish: string[] }> = {
  'Water & Drainage': {
    hi: ['पानी', 'नाली', 'नाला', 'गटर', 'सीवर', 'बाढ़', 'जलभराव', 'पाइप', 'लीकेज', 'ओवरफ्लो'],
    hinglish: ['pani', 'paani', 'nala', 'naala', 'gutter', 'sewer', 'drain', 'flood', 'jalbhrav', 'leakage', 'overflow']
  },
  'Roads & Traffic': {
    hi: ['सड़क', 'गड्ढा', 'यातायात', 'सिग्नल', 'ट्रैफिक', 'जाम', 'एस्पाल्ट', 'फुटपाथ'],
    hinglish: ['sadak', 'gaddha', 'pothole', 'traffic', 'jam', 'signal', 'asphalt', 'footpath', 'footpath']
  },
  'Public Sanitation': {
    hi: ['कूड़ा', 'कचरा', 'गंदगी', 'सफाई', 'डस्टबिन', 'कूड़ादान', 'कचरा डाला', 'सफाई कर्मचारी'],
    hinglish: ['kuda', 'kchra', 'gandagi', 'safai', 'dustbin', 'garbage', 'waste', 'trash', 'dumping', 'litter']
  },
  'Power & Lighting': {
    hi: ['बिजली', 'लाइट', 'स्ट्रीट लाइट', 'ट्रांसफार्मर', 'बिजली कटौती', 'अंधेरा', 'तार', 'कबल'],
    hinglish: ['bijli', 'light', 'streetlight', 'street light', 'transformer', 'blackout', 'outage', 'power cut', 'wire', 'cable']
  },
  'Parks & Environment': {
    hi: ['पार्क', 'पेड़', 'झाड़ी', 'बगीचा', 'झील', 'तालाब', 'पौधा', 'हरियाली'],
    hinglish: ['park', 'tree', 'branch', 'garden', 'lake', 'pond', 'plant', 'greenery', 'foliage']
  },
  'Structural Safety': {
    hi: ['भवन', 'दीवार', 'दरार', 'ढहना', 'पुल', 'खंभा', 'स्तंभ', 'इमारत'],
    hinglish: ['building', 'wall', 'crack', 'collapse', 'bridge', 'pillar', 'structure', 'dangerous', 'unstable']
  },
  'Public Health': {
    hi: ['मच्छर', 'बीमारी', 'डेंगू', 'मलेरिया', 'चूहा', 'कुत्ता', 'कचरा', 'स्वच्छता'],
    hinglish: ['mosquito', 'disease', 'dengue', 'malaria', 'rodent', 'rat', 'dog', 'bite', 'hygiene', 'medical waste']
  },
  'Noise & Disturbance': {
    hi: ['शोर', 'ध्वनि', 'लाउडस्पीकर', 'निर्माण', 'शोरगुल', 'शांति भंग'],
    hinglish: ['shor', 'noise', 'loudspeaker', 'sound', 'construction', 'disturbance', 'honking', 'generator']
  }
};

// Map urgency terms to UrgencyLevel
const URGENCY_TERM_MAP: Record<string, UrgencyLevel> = {
  'critical': 'critical', 'high': 'high', 'medium': 'medium', 'low': 'low'
};

export interface MultilingualClassificationResult {
  predictedCategory: ReportCategory;
  confidence: number;
  language: DetectedLanguage;
  languageConfidence: number;
  allScores: { category: ReportCategory; score: number }[];
  keywords: string[];
  civicTerms: string[];
  urgencyTerms: string[];
  locationTerms: string[];
  severity: UrgencyLevel;
  explanation: string;
  modelVersion: string;
  lowConfidenceReview: boolean;
}

export function classifyMultilingualReport(
  text: string,
  declaredCategory?: ReportCategory
): MultilingualClassificationResult {
  const langResult = detectLanguage(text);
  const language = langResult.language;
  const preprocessed = preprocessMultilingualText(text);

  // Get base classification from existing TF-IDF classifier
  const baseResult = classifyReport(text, declaredCategory);

  // Boost scores based on language-specific civic terms
  const boostedScores: { category: ReportCategory; score: number }[] = [];

  for (const baseScore of baseResult.allScores) {
    let boostedScore = baseScore.score;
    const categoryKeywords = CATEGORY_HINDI_KEYWORDS[baseScore.category];

    if (categoryKeywords) {
      // Check Hindi Devanagari terms
      for (const hiTerm of categoryKeywords.hi) {
        if (text.toLowerCase().includes(hiTerm.toLowerCase())) {
          boostedScore += 0.15;
        }
      }
      // Check Hinglish terms
      const lowerText = text.toLowerCase();
      for (const hTerm of categoryKeywords.hinglish) {
        if (lowerText.includes(hTerm.toLowerCase())) {
          boostedScore += 0.12;
        }
      }
    }

    boostedScores.push({ category: baseScore.category, score: Math.min(1.0, boostedScore) });
  }

  boostedScores.sort((a, b) => b.score - a.score);

  let top = boostedScores[0];
  let confidence = Math.min(0.96, Math.max(0.50, top.score * 1.6));

  // Apply declared category boost
  if (declaredCategory) {
    const declaredMatch = boostedScores.find(s => s.category === declaredCategory);
    if (declaredMatch && declaredMatch.score > 0.15) {
      top = declaredMatch;
      confidence = Math.min(0.95, confidence + 0.1);
    }
  }

  // Determine severity using existing classifier + Hindi urgency terms
  const baseSeverity = determineSeverity(text);
  let severity = baseSeverity;

  // Check Hindi urgency terms
  for (const term of preprocessed.urgencyTerms) {
    const level = URGENCY_TERM_MAP[term];
    if (level) {
      const rank: Record<UrgencyLevel, number> = { low: 1, medium: 2, high: 3, critical: 4 };
      if (rank[level] > rank[severity]) {
        severity = level;
      }
    }
  }

  // Extract entities using existing extractor (works on Latin text; Hindi terms extracted separately)
  const entities = extractEntities(text);

  // Build keywords from civic terms + extracted entities
  const allKeywords = [
    ...preprocessed.civicTerms,
    ...entities.locations,
    ...entities.infrastructure,
    ...entities.hazards
  ];

  // Build explanation
  const langName = language === 'unknown' ? 'undetermined' : language;
  const explanationParts = [
    `Language detected: ${langName} (confidence ${langResult.confidence})`,
    `Category: ${top.category} (score ${top.score.toFixed(3)}, confidence ${(confidence * 100).toFixed(0)}%)`,
    `Severity: ${severity}`,
    `Civic terms found: ${preprocessed.civicTerms.length > 0 ? preprocessed.civicTerms.join(', ') : 'none'}`,
    `Urgency indicators: ${preprocessed.urgencyTerms.length > 0 ? preprocessed.urgencyTerms.join(', ') : 'none'}`,
    `Location indicators: ${preprocessed.locationTerms.length > 0 ? preprocessed.locationTerms.join(', ') : 'none'}`
  ];

  return {
    predictedCategory: top.category,
    confidence: Number(confidence.toFixed(2)),
    language,
    languageConfidence: langResult.confidence,
    allScores: boostedScores.map(s => ({ category: s.category, score: Number(s.score.toFixed(3)) })),
    keywords: Array.from(new Set(allKeywords)).slice(0, 10),
    civicTerms: preprocessed.civicTerms,
    urgencyTerms: preprocessed.urgencyTerms,
    locationTerms: preprocessed.locationTerms,
    severity,
    explanation: explanationParts.join('; '),
    modelVersion: 'scip-multilingual-ts-v1.0',
    lowConfidenceReview: confidence < 0.65
  };
}

export function predictPriority(
  text: string,
  category: ReportCategory,
  urgencyDeclared?: UrgencyLevel
): { priority: UrgencyLevel; confidence: number; reasoning: string[] } {
  const reasoning: string[] = [];
  const preprocessed = preprocessMultilingualText(text);

  let priority: UrgencyLevel = urgencyDeclared || 'low';
  let confidence = 0.5;

  // Check Hindi urgency indicators
  const urgencyTerms = preprocessed.urgencyTerms;
  if (urgencyTerms.length > 0) {
    const rank: Record<UrgencyLevel, number> = { low: 1, medium: 2, high: 3, critical: 4 };
    let bestLevel: UrgencyLevel = 'low';
    let bestRank = 0;

    for (const term of urgencyTerms) {
      const level = URGENCY_TERM_MAP[term];
      if (level && rank[level] > bestRank) {
        bestRank = rank[level];
        bestLevel = level;
      }
    }

    if (bestRank > rank[priority]) {
      priority = bestLevel;
      confidence = Math.min(0.9, 0.6 + urgencyTerms.length * 0.1);
      reasoning.push(`Hinglish/Hindi urgency term detected: ${urgencyTerms.join(', ')} → ${priority}`);
    }
  }

  // Use existing severity determination as additional signal
  const baseSeverity = determineSeverity(text, urgencyDeclared);
  const severityRank: Record<UrgencyLevel, number> = { low: 1, medium: 2, high: 3, critical: 4 };

  if (severityRank[baseSeverity] > severityRank[priority]) {
    priority = baseSeverity;
    confidence = Math.min(0.95, confidence + 0.15);
    reasoning.push(`Keyword-based severity escalation: ${baseSeverity}`);
  }

  // Category-based adjustment
  const criticalCategories = ['Power & Lighting', 'Structural Safety'];
  if (criticalCategories.includes(category) && priority === 'low') {
    priority = 'medium';
    confidence = Math.min(0.8, confidence + 0.1);
    reasoning.push(`Category ${category} implies minimum medium priority for infrastructure safety`);
  }

  reasoning.push(`Final priority: ${priority} (confidence ${(confidence * 100).toFixed(0)}%)`);

  return { priority, confidence: Number(confidence.toFixed(2)), reasoning };
}

export const multilingualClassifier = {
  classifyMultilingualReport,
  predictPriority
};
