// SCIP AI - Hindi & Hinglish Text Preprocessor
// Normalizes Devanagari (Hindi), Latin (English), Hinglish (Romanized Hindi),
// and mixed Hindi-English civic complaint text.
// No external dependencies: pure TypeScript string/Unicode operations.

import { detectLanguage, normalizeHinglish, DetectedLanguage } from './languageDetector.js';

// Hindi stopwords (common function words in Devanagari script)
const HINDI_STOPWORDS = new Set([
  'कै', 'की', 'का', 'कु', 'को', 'के', 'से', 'में', 'पर', 'और', 'या',
  'है', 'हैं', 'था', 'थी', 'थे', 'होगा', 'होती', 'होता', 'होंगे',
  'में', 'को', 'से', 'के', 'की', 'का', 'है', 'हैं', 'था', 'थी',
  'मैं', 'तुम', 'वह', 'यह', 'ये', 'वे', 'कौन', 'क्या', 'कहाँ', 'कब',
  'क्यों', 'कैसे', 'कितना', 'कितने', 'कुछ', 'सब', 'हर', 'कोई',
  'अपना', 'अपने', 'अपनी', 'अपना', 'इसी', 'उस', 'उन', 'उनकी',
  'मेरा', 'मेरे', 'मेरी', 'तेरा', 'तेरे', 'तेरी', 'हमारा', 'हमारे',
  'आपका', 'आपके', 'आपकी', 'जो', 'जिस', 'जिसने', 'जिसे', 'जिसका',
  'ताकि', 'जब', 'तब', 'पहले', 'बाद', 'अब', 'अभी', 'पहले', 'बाद में',
  'द्वारा', 'के लिए', 'के साथ', 'के बारे में', 'के अंतर्गत',
  'नहीं', 'न', 'ना', 'हाँ', 'जी', 'कृपया', 'धन्यवाद', 'नमस्ते'
]);

// Hindi civic terminology mapping (Devanagari → English category keywords)
const HINDI_CIVIC_TERMS: Record<string, string[]> = {
  'पानी': ['water', 'water supply'],
  'पानी की कमी': ['water shortage', 'water scarcity'],
  'नाली': ['drain', 'drainage'],
  'नाला': ['drain', 'sewer', 'drainage'],
  'गटर': ['gutter', 'drain'],
  'सीवर': ['sewer', 'sewage'],
  'बाढ़': ['flood', 'flooding'],
  'जलभराव': ['waterlogging', 'water accumulation'],
  'सड़क': ['road', 'street'],
  'गड्ढा': ['pothole'],
  'यातायात': ['traffic'],
  'सिग्नल': ['traffic signal', 'traffic light'],
  'कूड़ा': ['garbage', 'waste', 'trash'],
  'कचरा': ['garbage', 'waste', 'refuse'],
  'सफाई': ['cleanliness', 'sanitation', 'sweeping'],
  'डस्टबिन': ['dustbin', 'garbage bin'],
  'बिजली': ['electricity', 'power'],
  'लाइट': ['light', 'streetlight'],
  'स्ट्रीट लाइट': ['streetlight'],
  'ट्रांसफार्मर': ['transformer'],
  'बिजली कटौती': ['power outage', 'blackout'],
  'अंधेरा': ['dark', 'darkness'],
  'पार्क': ['park', 'garden'],
  'पेड़': ['tree'],
  'झाड़ी': ['bush', 'foliage'],
  'भवन': ['building'],
  'दीवार': ['wall'],
  'दरार': ['crack', 'structural crack'],
  'ढहना': ['collapse', 'collapsed'],
  'पुल': ['bridge'],
  'रौशनी': ['lighting', 'illumination'],
  'मच्छर': ['mosquito'],
  'बीमारी': ['disease', 'illness'],
  'डेंगू': ['dengue'],
  'मलेरिया': ['malaria'],
  'चूहा': ['rodent', 'rat'],
  'कुत्ता': ['dog', 'stray dog'],
  'कूड़ा_मेडिकल': ['medical waste'],
  'शोर': ['noise'],
  'ध्वनि': ['sound', 'noise'],
  'लाउडस्पीकर': ['loudspeaker'],
  'निर्माण': ['construction'],
  'पुलिस': ['police'],
  'थाना': ['police station'],
  'अस्पताल': ['hospital'],
  'स्कूल': ['school'],
  'कॉलेज': ['college'],
  'बाजार': ['market'],
  'दुकान': ['shop'],
  'गली': ['street', 'lane'],
  'मोहल्ला': ['neighborhood', 'locality'],
  'चौराहा': ['intersection', 'junction'],
  'पिन कोड': ['pincode', 'pin code'],
  'वार्ड': ['ward'],
  'नगर निगम': ['municipal corporation'],
  'पार्षद': ['corporator', 'councillor']
};

// Hindi urgency/criticality terms
const HINDI_URGENCY_TERMS: Record<string, string[]> = {
  critical: ['आपातकाल', 'आपात', 'गंभीर', 'भयानक', 'खतरनाक', 'मर गए', 'मौत', 'चोट', 'गंभीर चोट'],
  high: ['तुरंत', 'जल्दी', 'जरूरी', 'महत्वपूर्ण', 'बड़ा', 'बड़ा', 'भीषण'],
  medium: ['मध्यम', 'सामान्य', 'आधी', 'कुछ समय से'],
  low: ['कम', 'थोड़ा', 'छोटा', 'नॉर्मल', 'सामान्य']
};

// Hindi location indicators
const HINDI_LOCATION_TERMS = [
  'यहाँ', 'वहाँ', 'यह', 'वह', 'पास', 'के पास', 'के सामने',
  'के पास में', 'के आगे', 'के पीछे', 'के बीच में', 'के अंदर',
  'गली में', 'सड़क पर', 'चौक पर', 'बाजार में', 'पार्क में',
  'स्कूल के पास', 'अस्पताल के पास', 'पुल के पास', 'नाली के पास'
];

export interface PreprocessedText {
  original: string;
  normalized: string;
  language: DetectedLanguage;
  tokens: string[];
  civicTerms: string[];
  urgencyTerms: string[];
  locationTerms: string[];
  reasoning: string[];
}

export function preprocessMultilingualText(text: string): PreprocessedText {
  const reasoning: string[] = [];

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return {
      original: '',
      normalized: '',
      language: 'unknown',
      tokens: [],
      civicTerms: [],
      urgencyTerms: [],
      locationTerms: [],
      reasoning: ['Empty or non-string input']
    };
  }

  const original = text.trim();
  const langResult = detectLanguage(original);
  const language = langResult.language;
  reasoning.push(`Language detected: ${language} (confidence: ${langResult.confidence})`);

  let normalized = original;
  const civicTerms: string[] = [];
  const urgencyTerms: string[] = [];
  const locationTerms: string[] = [];

  if (language === 'hi' || language === 'mixed') {
    // Normalize Devanagari: normalize whitespace, remove zero-width characters
    normalized = normalized.replace(/\u200B|\u200C|\u200D|\uFEFF/g, '');
    normalized = normalized.replace(/\s+/g, ' ').trim();

    // Extract Hindi civic terms
    const lowerNorm = normalized.toLowerCase();
    for (const [hindiTerm, englishTerms] of Object.entries(HINDI_CIVIC_TERMS)) {
      if (lowerNorm.includes(hindiTerm)) {
        civicTerms.push(...englishTerms);
        reasoning.push(`Hindi civic term found: "${hindiTerm}" → ${englishTerms.join(', ')}`);
      }
    }

    // Extract Hindi urgency terms
    const urgencyLower = normalized.toLowerCase();
    for (const [level, terms] of Object.entries(HINDI_URGENCY_TERMS)) {
      for (const term of terms) {
        if (urgencyLower.includes(term)) {
          urgencyTerms.push(level);
          break;
        }
      }
    }

    // Extract Hindi location terms
    for (const locTerm of HINDI_LOCATION_TERMS) {
      if (urgencyLower.includes(locTerm)) {
        locationTerms.push(locTerm);
      }
    }
  }

  if (language === 'hinglish' || language === 'mixed') {
    // Normalize Hinglish: map Romanized Hindi to English equivalents
    normalized = normalizeHinglish(normalized);
    reasoning.push('Hinglish terms normalized to English equivalents');

    // Re-extract civic terms from normalized Hinglish (English equivalents now present)
    const lowerNorm = normalized.toLowerCase();
    const hinglishToEnglish: Record<string, string> = {
      'paani': 'water', 'pani': 'water', 'sadak': 'road', 'nala': 'drain',
      'naala': 'drain', 'kuda': 'waste', 'kchra': 'garbage', 'gandagi': 'dirt',
      'safai': 'cleanliness', 'bijli': 'electricity', 'shor': 'noise',
      'shikayat': 'complaint', 'samasya': 'problem', 'madad': 'help',
      'hospital': 'hospital', 'school': 'school', 'police': 'police',
      'thana': 'police station', 'pincode': 'pincode', 'ward': 'ward'
    };
    for (const [hinglish, english] of Object.entries(hinglishToEnglish)) {
      if (lowerNorm.includes(hinglish) || lowerNorm.includes(english)) {
        if (!civicTerms.includes(english)) civicTerms.push(english);
      }
    }
  }

  if (language === 'en') {
    normalized = normalized.replace(/\s+/g, ' ').trim();
    reasoning.push('English text normalized (whitespace only)');
  }

  // Tokenize: split on whitespace and punctuation, preserve Devanagari characters
  const tokens = normalized
    .split(/[\s\.,;:!?]+/)
    .filter(t => t.length > 0)
    .filter(t => !HINDI_STOPWORDS.has(t))
    .map(t => t.trim());

  reasoning.push(`Tokenized into ${tokens.length} tokens`);

  return {
    original,
    normalized,
    language,
    tokens,
    civicTerms: Array.from(new Set(civicTerms)),
    urgencyTerms: Array.from(new Set(urgencyTerms)),
    locationTerms: Array.from(new Set(locationTerms)),
    reasoning
  };
}

export function extractCivicKeywords(text: string): string[] {
  const result = preprocessMultilingualText(text);
  return result.civicTerms;
}

export function extractUrgencyIndicators(text: string): string[] {
  const result = preprocessMultilingualText(text);
  return result.urgencyTerms;
}

export function extractLocationIndicators(text: string): string[] {
  const result = preprocessMultilingualText(text);
  return result.locationTerms;
}

export const hindiPreprocessor = {
  preprocessMultilingualText,
  extractCivicKeywords,
  extractUrgencyIndicators,
  extractLocationIndicators
};
