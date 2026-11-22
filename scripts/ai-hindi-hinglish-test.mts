// SCIP AI - Hindi, English, Hinglish NLP Test Suite
// SYNTHETIC TEST DATA: All test inputs are synthetic/representative examples.
// No real PII, no real citizen data, no production accuracy claims.
// Results indicate algorithmic correctness, not production-ready accuracy.

import {
  detectLanguage, normalizeHinglish, isHinglishCandidate, getLanguageDisplayName,
  LanguageDetectionResult
} from '../src/ai/languageDetector.js';
import {
  preprocessMultilingualText, extractCivicKeywords, extractUrgencyIndicators,
  extractLocationIndicators
} from '../src/ai/hindiPreprocessor.js';
import {
  classifyMultilingualReport, predictPriority
} from '../src/ai/multilingualClassifier.js';
import {
  computeMultilingualSimilarity, findMultilingualSimilarAndDuplicateReports
} from '../src/ai/multilingualDuplicateDetector.js';
import { Report, ReportCategory } from '../src/types/scip.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${message}`);
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

function assertEquals(actual: unknown, expected: unknown, message: string) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
}

function assertApprox(actual: number, expected: number, tolerance: number, message: string) {
  assert(Math.abs(actual - expected) <= tolerance, `${message} (expected ~${expected}, got ${actual}, tolerance ${tolerance})`);
}

const now = () => new Date().toISOString();

function makeReport(overrides: Partial<Report> = {}): Report {
  return {
    id: 'REP-TEST-001',
    title: 'Test report',
    description: 'Test description',
    category: 'Water & Drainage',
    locationName: 'Test Location',
    latitude: 28.6139,
    longitude: 77.2090,
    citizenId: 'USR-001',
    citizenName: 'Test Citizen',
    citizenEmail: 'test@scip.gov',
    status: 'submitted',
    urgency: 'medium',
    createdAt: now(),
    updatedAt: now(),
    ...overrides
  };
}

// ============================================================================
// TEST SUITE 1: Language Detection
// ============================================================================
console.log('\n=== TEST SUITE 1: Language Detection ===\n');

// English
{
  const r = detectLanguage('Waterlogging outside market entrance after heavy rain');
  assert(r.language === 'en', 'English text detected as en');
  assert(r.scriptCounts.latin > 0, 'English has Latin characters');
  assert(r.scriptCounts.devanagari === 0, 'English has no Devanagari characters');
  assert(r.confidence > 0.5, 'English detection confidence > 0.5');
}

// Hindi (Devanagari)
{
  const r = detectLanguage('बाजार के बाहर भारी बारिश के बाद जलभराव');
  assert(r.language === 'hi', 'Hindi text detected as hi');
  assert(r.scriptCounts.devanagari > 0, 'Hindi has Devanagari characters');
  assert(r.scriptCounts.latin === 0, 'Pure Hindi has no Latin characters');
  assert(r.confidence > 0.5, 'Hindi detection confidence > 0.5');
}

// Hinglish (Romanized Hindi)
{
  const r = detectLanguage('Paani bhar gaya sadak par, bahut problem hai');
  assert(r.language === 'hinglish', 'Hinglish text detected as hinglish');
  assert(r.confidence > 0.5, 'Hinglish detection confidence > 0.5');
}

// Mixed Hindi-English (Devanagari + Latin)
{
  const r = detectLanguage('बाजार में पानी की समस्या waterlogging problem');
  assert(r.language === 'mixed', 'Mixed script detected as mixed');
  assert(r.scriptCounts.devanagari > 0, 'Mixed has Devanagari');
  assert(r.scriptCounts.latin > 0, 'Mixed has Latin');
}

// Empty input
{
  const r = detectLanguage('');
  assert(r.language === 'unknown', 'Empty input detected as unknown');
  assert(r.confidence === 0, 'Empty input confidence is 0');
}

{
  const r = detectLanguage('   ');
  assert(r.language === 'unknown', 'Whitespace-only input detected as unknown');
}

// Malformed/special characters
{
  const r = detectLanguage('!!! @@@ ### $$$');
  assert(r.language === 'unknown', 'Symbol-only input detected as unknown');
}

// Spelling variations (Hinglish)
{
  const r1 = detectLanguage('Pani gir raha hai road par');
  assert(r1.language === 'hinglish', 'Hinglish spelling variant 1 detected');

  const r2 = detectLanguage('Paani jam ho gaya gali mein');
  assert(r2.language === 'hinglish', 'Hinglish spelling variant 2 detected');
}

// getLanguageDisplayName
{
  assert(getLanguageDisplayName('hi') === 'Hindi (Devanagari)', 'Hindi display name correct');
  assert(getLanguageDisplayName('en') === 'English', 'English display name correct');
  assert(getLanguageDisplayName('hinglish') === 'Hinglish (Romanized Hindi)', 'Hinglish display name correct');
  assert(getLanguageDisplayName('mixed') === 'Mixed Hindi-English', 'Mixed display name correct');
  assert(getLanguageDisplayName('unknown') === 'Unknown', 'Unknown display name correct');
}

// isHinglishCandidate
{
  assert(isHinglishCandidate('Paani problem hai') === true, 'Hinglish text is candidate');
  assert(isHinglishCandidate('Water problem') === false, 'English text is not Hinglish candidate');
  assert(isHinglishCandidate('पानी की समस्या') === false, 'Pure Hindi is not Hinglish candidate');
}

// normalizeHinglish
{
  const norm = normalizeHinglish('Paani problem hai sadak par');
  assert(norm.includes('water'), 'Paani normalized to water');
  assert(norm.includes('road'), 'sadak normalized to road');
}

// ============================================================================
// TEST SUITE 2: Text Preprocessing
// ============================================================================
console.log('\n=== TEST SUITE 2: Text Preprocessing ===\n');

{
  const result = preprocessMultilingualText('Waterlogging outside market entrance');
  assert(result.language === 'en', 'Preprocess English detects en');
  assert(result.tokens.length > 0, 'English produces tokens');
  assert(result.normalized.length > 0, 'English produces normalized text');
}

{
  const result = preprocessMultilingualText('बाजार के बाहर जलभराव');
  assert(result.language === 'hi', 'Preprocess Hindi detects hi');
  assert(result.civicTerms.length > 0 || result.tokens.length > 0, 'Hindi produces terms or tokens');
}

{
  const result = preprocessMultilingualText('Paani problem hai road par');
  assert(result.language === 'hinglish', 'Preprocess Hinglish detects hinglish');
  assert(result.civicTerms.includes('water') || result.civicTerms.includes('road'), 'Hinglish extracts civic terms');
}

// Empty input
{
  const result = preprocessMultilingualText('');
  assert(result.language === 'unknown', 'Empty preprocess returns unknown');
  assert(result.tokens.length === 0, 'Empty preprocess returns no tokens');
}

// extractCivicKeywords
{
  const terms = extractCivicKeywords('पानी की समस्या है पानी लीक हो रहा है');
  assert(Array.isArray(terms), 'extractCivicKeywords returns array');
}

// extractUrgencyIndicators
{
  const terms = extractUrgencyIndicators('यह बहुत गंभीर समस्या है तुरंत ठीक करें');
  assert(Array.isArray(terms), 'extractUrgencyIndicators returns array');
}

// extractLocationIndicators
{
  const terms = extractLocationIndicators('बाजार के बाहर पानी भरा है');
  assert(Array.isArray(terms), 'extractLocationIndicators returns array');
}

// ============================================================================
// TEST SUITE 3: Multilingual Classification
// ============================================================================
console.log('\n=== TEST SUITE 3: Multilingual Classification ===\n');

{
  const result = classifyMultilingualReport('Waterlogging outside market entrance after heavy rain');
  assert(typeof result.predictedCategory === 'string', 'Classification returns category');
  assert(result.confidence >= 0 && result.confidence <= 1, 'Confidence in [0,1]');
  assert(typeof result.language === 'string', 'Language field present');
  assert(result.allScores.length > 0, 'All scores present');
  assert(typeof result.explanation === 'string' && result.explanation.length > 0, 'Explanation present');
  assert(typeof result.modelVersion === 'string', 'Model version present');
}

{
  const result = classifyMultilingualReport('बाजार के बाहर भारी बारिश के बाद जलभराव');
  assert(result.language === 'hi', 'Hindi text detected as hi');
  assert(typeof result.predictedCategory === 'string', 'Hindi classification returns category');
  assert(result.languageConfidence > 0, 'Language confidence > 0');
}

{
  const result = classifyMultilingualReport('Paani bhar gaya sadak par bahut problem');
  assert(result.language === 'hinglish', 'Hinglish text detected as hinglish');
  assert(typeof result.predictedCategory === 'string', 'Hinglish classification returns category');
}

// Declared category
{
  const result = classifyMultilingualReport('Water problem', 'Power & Lighting');
  assert(result.predictedCategory === 'Power & Lighting' || result.predictedCategory === 'Water & Drainage', 'Declared category considered');
}

// Priority prediction
{
  const result = predictPriority('Water problem', 'Water & Drainage');
  assert(typeof result.priority === 'string', 'Priority prediction returns priority');
  assert(['low', 'medium', 'high', 'critical'].includes(result.priority), 'Priority is valid level');
  assert(result.confidence >= 0 && result.confidence <= 1, 'Priority confidence in [0,1]');
  assert(Array.isArray(result.reasoning), 'Priority reasoning is array');
}

{
  const result = predictPriority('गंभीर बिजली कटौती तुरंत ठीक करें', 'Power & Lighting');
  assert(result.priority === 'high' || result.priority === 'critical', 'Hindi critical terms escalate priority');
}

// ============================================================================
// TEST SUITE 4: Semantic Similarity
// ============================================================================
console.log('\n=== TEST SUITE 4: Semantic Similarity ===\n');

{
  const result = computeMultilingualSimilarity(
    'Waterlogging outside market entrance',
    'Water accumulation near market gate after rain'
  );
  assert(result.similarity >= 0 && result.similarity <= 1, 'Similarity in [0,1]');
  assert(typeof result.modelId === 'string', 'Model ID present');
  assert(Array.isArray(result.reasoning), 'Reasoning is array');
}

{
  const result = computeMultilingualSimilarity(
    'Water problem',
    'Paani problem hai'
  );
  assert(result.similarity >= 0, 'Cross-language (English-Hinglish) similarity computed');
  assert(result.languageMatch === true, 'English-Hinglish considered language match');
}

{
  const result = computeMultilingualSimilarity('', 'Some text');
  assert(result.similarity === 0, 'Empty text similarity is 0');
}

{
  const result = computeMultilingualSimilarity('Water problem', '');
  assert(result.similarity === 0, 'Empty second text similarity is 0');
}

// ============================================================================
// TEST SUITE 5: Multilingual Duplicate Detection
// ============================================================================
console.log('\n=== TEST SUITE 5: Multilingual Duplicate Detection ===\n');

const target = makeReport({
  title: 'Waterlogging outside market entrance',
  description: 'Heavy rain has caused water to accumulate outside the main market entrance',
  category: 'Water & Drainage',
  latitude: 28.6139,
  longitude: 77.2090
});

const similarReport = makeReport({
  id: 'REP-TEST-002',
  title: 'Water accumulation near market gate',
  description: 'Rain water is pooling outside market entrance',
  category: 'Water & Drainage',
  latitude: 28.6140,
  longitude: 77.2091,
  createdAt: now()
});

const differentReport = makeReport({
  id: 'REP-TEST-003',
  title: 'Streetlight not working on main avenue',
  description: 'All streetlights along the avenue have been dark for 3 nights',
  category: 'Power & Lighting',
  latitude: 28.6500,
  longitude: 77.2200,
  createdAt: now()
});

{
  const result = findMultilingualSimilarAndDuplicateReports(target, [target, similarReport, differentReport]);
  assert(Array.isArray(result.topSimilar), 'topSimilar is array');
  assert(typeof result.duplicateProbability === 'number', 'duplicateProbability is number');
  assert(result.duplicateProbability >= 0 && result.duplicateProbability <= 1, 'duplicateProbability in [0,1]');
  assert(Array.isArray(result.evidence), 'evidence is array');
}

{
  const result = findMultilingualSimilarAndDuplicateReports(target, []);
  assert(result.topSimilar.length === 0, 'Empty corpus returns no matches');
  assert(result.duplicateProbability === 0, 'Empty corpus duplicate probability is 0');
}

// Cross-language duplicate: English target vs Hinglish similar
{
  const hinglishSimilar = makeReport({
    id: 'REP-TEST-004',
    title: 'Paani bhar gaya bazaar ke bahar',
    description: 'Barish ke baad paani jama ho gaya market ke bahar',
    category: 'Water & Drainage',
    latitude: 28.6140,
    longitude: 77.2091,
    createdAt: now()
  });
  const result = findMultilingualSimilarAndDuplicateReports(target, [target, hinglishSimilar]);
  assert(result.topSimilar.length > 0, 'Cross-language duplicate detected');
}

// ============================================================================
// TEST SUITE 6: Model Registry Integration
// ============================================================================
console.log('\n=== TEST SUITE 6: Model Registry Integration ===\n');

import { modelRegistry } from '../src/ai/modelRegistry.js';

{
  const classifier = modelRegistry.getModel('scip-multilingual-classifier');
  assert(classifier !== undefined, 'Multilingual classifier registered');
  assert(classifier?.activeVersion === '1.0.0', 'Multilingual classifier active version is 1.0.0');
}

{
  const dupDetector = modelRegistry.getModel('scip-multilingual-duplicate-detector');
  assert(dupDetector !== undefined, 'Multilingual duplicate detector registered');
}

{
  const entityExtractor = modelRegistry.getModel('scip-multilingual-entity-extractor');
  assert(entityExtractor !== undefined, 'Multilingual entity extractor registered');
}

{
  const selection = modelRegistry.selectModel({ task: 'classification', framework: 'tfidf-ts', preferProduction: true });
  assert(selection !== null, 'Model selection returns result for classification');
  assert(selection?.framework === 'tfidf-ts', 'Selected framework is tfidf-ts');
}

// ============================================================================
// TEST SUITE 7: Edge Cases
// ============================================================================
console.log('\n=== TEST SUITE 7: Edge Cases ===\n');

// Very long text
{
  const longText = 'Water problem. '.repeat(100);
  const result = classifyMultilingualReport(longText);
  assert(typeof result.predictedCategory === 'string', 'Long text classified without error');
  assert(result.confidence >= 0 && result.confidence <= 1, 'Long text confidence in [0,1]');
}

// Unicode/devanagari with punctuation
{
  const result = classifyMultilingualTextWrapper('बाजार के बाहर, जलभराव है! क्या करें?');
  assert(result.language === 'hi', 'Hindi with punctuation detected as hi');
}

function classifyMultilingualTextWrapper(text: string) {
  return classifyMultilingualReport(text);
}

// Numbers and mixed content
{
  const result = classifyMultilingualReport('Water problem at sector 4, plot 12');
  assert(typeof result.predictedCategory === 'string', 'Text with numbers classified');
  assert(result.language === 'en', 'Text with numbers detected as en');
}

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n========================================');
console.log('HINDI/HINGLISH NLP TEST SUMMARY');
console.log('========================================');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
}
