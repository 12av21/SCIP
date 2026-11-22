// SCIP - Civic Dataset Pipeline (Phase 3: Training Data Management)
// Labeled municipal report dataset for training, evaluation, and benchmarking of SCIP AI models

import { CivicDatasetEntry, ReportCategory, UrgencyLevel, DatasetSplit, DatasetVersion, LabeledExample, DatasetQualityMetrics } from '../types/scip';
import { classifyReport, extractEntities, determineSeverity } from '../ai/classifier';

// Seed dataset with synthetic + manually curated examples
const SEED_DATASET: Omit<CivicDatasetEntry, 'id' | 'createdAt' | 'split'>[] = [
  // Water & Drainage
  { title: 'Severe water accumulation on Main Street after heavy rain', description: 'Storm drain completely blocked causing flooding up to knee level near bus stop. Water not receding for 6 hours.', text: '', trueCategory: 'Water & Drainage', urgency: 'high', locationName: 'Main Street Bus Stop', latitude: 28.625, longitude: 77.218, source: 'seed' },
  { title: 'Sewage overflow near residential colony', description: 'Manhole cover displaced, raw sewage flowing into street. Strong odor and health hazard for children playing nearby.', text: '', trueCategory: 'Water & Drainage', urgency: 'critical', locationName: 'Green Valley Colony', latitude: 28.630, longitude: 77.220, source: 'seed' },
  { title: 'Blocked storm water drain causing road flooding', description: 'Plastic waste and debris clogging drain inlet. Water level rising on service road during light rain.', text: '', trueCategory: 'Water & Drainage', urgency: 'medium', locationName: 'Service Road Sector 12', latitude: 28.628, longitude: 77.215, source: 'seed' },
  { title: 'Water pipe burst flooding intersection', description: 'Main water supply line burst at intersection, water gushing 3 meters high. Traffic diverted, shops affected.', text: '', trueCategory: 'Water & Drainage', urgency: 'critical', locationName: 'Market Chowk Intersection', latitude: 28.635, longitude: 77.225, source: 'seed' },
  { title: 'Drainage canal overflowing during monsoon', description: 'Canal breached banks near slum area. Houses at risk, evacuation may be needed. Pumps not working.', text: '', trueCategory: 'Water & Drainage', urgency: 'critical', locationName: 'Riverside Slum Area', latitude: 28.640, longitude: 77.230, source: 'seed' },

  // Roads & Traffic
  { title: 'Large pothole on highway causing accidents', description: 'Deep pothole 2 feet wide on NH-48 near exit 14. Two bikes already damaged this morning. Urgent repair needed.', text: '', trueCategory: 'Roads & Traffic', urgency: 'high', locationName: 'NH-48 Exit 14', latitude: 28.615, longitude: 77.208, source: 'seed' },
  { title: 'Traffic signal not working at busy junction', description: 'All four lights blinking red since yesterday. Traffic police not deployed. Near miss accidents reported every hour.', text: '', trueCategory: 'Roads & Traffic', urgency: 'high', locationName: 'Ring Road Junction', latitude: 28.622, longitude: 77.212, source: 'seed' },
  { title: 'Road cave-in near construction site', description: 'Ground subsidence 3 meters diameter near metro construction. Barricades fallen. Risk of building foundation damage.', text: '', trueCategory: 'Roads & Traffic', urgency: 'critical', locationName: 'Metro Construction Zone', latitude: 28.618, longitude: 77.210, source: 'seed' },
  { title: 'Missing speed breakers near school zone', description: 'Vehicles speeding past primary school. Children crossing unsafe. Request speed humps and zebra crossing.', text: '', trueCategory: 'Roads & Traffic', urgency: 'medium', locationName: 'St. Mary School Area', latitude: 28.627, longitude: 77.217, source: 'seed' },
  { title: 'Street lights not working on arterial road', description: 'Complete darkness on 2km stretch of Outer Ring Road. Multiple accidents last week. Women feeling unsafe.', text: '', trueCategory: 'Roads & Traffic', urgency: 'high', locationName: 'Outer Ring Road Sector 5', latitude: 28.632, longitude: 77.222, source: 'seed' },

  // Public Sanitation
  { title: 'Garbage not collected for 2 weeks in residential area', description: 'Municipal bins overflowing, waste scattered by stray animals. Flies and mosquitoes breeding. Health emergency.', text: '', trueCategory: 'Public Sanitation', urgency: 'high', locationName: 'Sector 7 Residential', latitude: 28.612, longitude: 77.205, source: 'seed' },
  { title: 'Public toilet block non-functional for months', description: 'All 6 units broken, no water supply, doors missing. Open defecation forced. Near market area.', text: '', trueCategory: 'Public Sanitation', urgency: 'high', locationName: 'Main Market Toilet Block', latitude: 28.620, longitude: 77.210, source: 'seed' },
  { title: 'Dead animal carcass on main road', description: 'Large dog carcass on service lane since 3 days. Stray dogs gathering. Bad smell, disease risk for pedestrians.', text: '', trueCategory: 'Public Sanitation', urgency: 'medium', locationName: 'Service Lane Phase 2', latitude: 28.618, longitude: 77.214, source: 'seed' },
  { title: 'Construction debris dumped illegally in park', description: 'Truckloads of cement, bricks dumped in children\'s park at night. Play equipment damaged. No action for 10 days.', text: '', trueCategory: 'Public Sanitation', urgency: 'medium', locationName: 'Central Park Sector 3', latitude: 28.625, longitude: 77.219, source: 'seed' },
  { title: 'Overflowing community dustbin near temple', description: 'Dustbin not emptied for week during festival season. Waste attracting pigs and creating unhygienic conditions.', text: '', trueCategory: 'Public Sanitation', urgency: 'high', locationName: 'Hanuman Temple Road', latitude: 28.629, longitude: 77.221, source: 'seed' },

  // Power & Lighting
  { title: 'Transformer sparking and power fluctuation', description: 'Distribution transformer making loud noise, sparks visible at night. Voltage fluctuations damaging appliances in 50 houses.', text: '', trueCategory: 'Power & Lighting', urgency: 'critical', locationName: 'Block A Transformer', latitude: 28.631, longitude: 77.223, source: 'seed' },
  { title: 'Street light pole leaning dangerously', description: 'Electric pole tilted 30 degrees after storm. Live wires touching tree branches. Children playing underneath.', text: '', trueCategory: 'Power & Lighting', urgency: 'critical', locationName: 'Playground Lane', latitude: 28.626, longitude: 77.216, source: 'seed' },
  { title: 'Frequent power cuts in industrial area', description: '4-5 hours daily outage for past month. Factories losing production. DG sets running increasing pollution.', text: '', trueCategory: 'Power & Lighting', urgency: 'high', locationName: 'Industrial Area Phase 1', latitude: 28.610, longitude: 77.200, source: 'seed' },
  { title: 'High tension wire sagging over residential street', description: '11kV line hanging at 8 feet height. Monsoon winds causing wires to swing. Immediate danger to passing vehicles.', text: '', trueCategory: 'Power & Lighting', urgency: 'critical', locationName: 'Gali No. 4 Residential', latitude: 28.624, longitude: 77.218, source: 'seed' },
  { title: 'Electric meter box smoking in apartment', description: 'Common meter room filling with smoke. Residents evacuated. Fire brigade called. Suspected short circuit in main line.', text: '', trueCategory: 'Power & Lighting', urgency: 'critical', locationName: 'Sunrise Apartments', latitude: 28.633, longitude: 77.224, source: 'seed' },

  // Parks & Environment
  { title: 'Illegal tree cutting in protected green belt', description: '10 mature neem trees cut overnight in notified forest area. Timber loaded in trucks. No permission displayed.', text: '', trueCategory: 'Parks & Environment', urgency: 'high', locationName: 'City Forest Green Belt', latitude: 28.638, longitude: 77.228, source: 'seed' },
  { title: 'Lake water turning green with algal bloom', description: 'Community lake water toxic green. Fish dying. Foul smell spreading to nearby colony. Sewage inflow suspected.', text: '', trueCategory: 'Parks & Environment', urgency: 'high', locationName: 'Lotus Lake Community', latitude: 28.636, longitude: 77.226, source: 'seed' },
  { title: 'Park encroachment by commercial vendors', description: 'Permanent food stalls constructed inside municipal park. Walking track blocked. No action despite multiple complaints.', text: '', trueCategory: 'Parks & Environment', urgency: 'medium', locationName: 'Nehru Park Extension', latitude: 28.634, longitude: 77.227, source: 'seed' },

  // Structural Safety
  { title: 'Cracks in apartment building columns', description: 'Vertical cracks 5mm wide on ground floor columns of 15-year-old building. Residents fearful of collapse.', text: '', trueCategory: 'Structural Safety', urgency: 'critical', locationName: 'Hill View Apartments', latitude: 28.637, longitude: 77.229, source: 'seed' },
  { title: 'Boundary wall collapse risk near school', description: '15ft high compound wall leaning outward. Bricks falling on footpath. Primary school children at risk during assembly.', text: '', trueCategory: 'Structural Safety', urgency: 'critical', locationName: 'Government Primary School', latitude: 28.623, longitude: 77.213, source: 'seed' },
  { title: 'Footbridge railing broken over drain', description: 'Pedestrian bridge railings missing for 10 meters. Elderly and children crossing open drain daily. One fall reported.', text: '', trueCategory: 'Structural Safety', urgency: 'high', locationName: 'Footbridge Sector 9', latitude: 28.621, longitude: 77.211, source: 'seed' },

  // Public Health
  { title: 'Mosquito breeding in stagnant water at construction site', description: 'Large puddles at building site not drained. Dengue cases reported in surrounding houses. No larvicide spraying.', text: '', trueCategory: 'Public Health', urgency: 'high', locationName: 'Construction Site Plot 45', latitude: 28.616, longitude: 77.206, source: 'seed' },
  { title: 'Stray dog pack attacking residents', description: 'Pack of 8 aggressive dogs biting morning walkers. 3 people hospitalized this week. Animal birth control not done.', text: '', trueCategory: 'Public Health', urgency: 'high', locationName: 'Morning Walk Park', latitude: 28.614, longitude: 77.204, source: 'seed' },
  { title: 'Food vendor operating without license near hospital', description: 'Unhygienic food preparation visible. Patients\' relatives buying contaminated food. Health department not inspecting.', text: '', trueCategory: 'Public Health', urgency: 'medium', locationName: 'City Hospital Back Gate', latitude: 28.619, longitude: 77.209, source: 'seed' },

  // Noise & Disturbance
  { title: 'Late night DJ events in residential colony', description: 'Loud music till 3 AM every weekend from banquet hall. Senior citizens and students unable to sleep. Police not responding.', text: '', trueCategory: 'Noise & Disturbance', urgency: 'medium', locationName: 'Peaceful Colony Banquet Hall', latitude: 28.613, longitude: 77.203, source: 'seed' },
  { title: 'Factory machinery noise exceeding limits', description: 'Continuous grinding noise 24/7 from steel unit. Vibrations felt in adjacent homes. Decibel levels measured at 95dB.', text: '', trueCategory: 'Noise & Disturbance', urgency: 'high', locationName: 'Steel Factory Industrial Zone', latitude: 28.609, longitude: 77.199, source: 'seed' },
];

// In-memory dataset storage
let datasetEntries: CivicDatasetEntry[] = [];
let datasetVersions: DatasetVersion[] = [];
let currentDatasetVersion = '1.0.0';
let datasetInitialized = false;

function initializeDataset() {
  if (datasetInitialized) return;
  
  // Create seed entries with splits
  const categories = [...new Set(SEED_DATASET.map(e => e.trueCategory))];
  const entriesPerCategory = new Map<string, number[]>();
  
  SEED_DATASET.forEach((entry, index) => {
    if (!entriesPerCategory.has(entry.trueCategory)) {
      entriesPerCategory.set(entry.trueCategory, []);
    }
    entriesPerCategory.get(entry.trueCategory)!.push(index);
  });

  // Stratified split: 70% train, 15% validation, 15% test
  datasetEntries = SEED_DATASET.map((entry, index) => {
    const catIndices = entriesPerCategory.get(entry.trueCategory)!;
    const catPosition = catIndices.indexOf(index);
    const totalCat = catIndices.length;
    const trainEnd = Math.floor(totalCat * 0.7);
    const valEnd = trainEnd + Math.floor(totalCat * 0.15);
    
    let split: DatasetSplit = 'train';
    if (catPosition >= trainEnd && catPosition < valEnd) split = 'validation';
    else if (catPosition >= valEnd) split = 'test';

    return {
      ...entry,
      id: `DS-${String(index + 1).padStart(4, '0')}`,
      text: `${entry.title} ${entry.description}`,
      split,
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
    };
  });

  // Create initial version
  const categoryDist: Record<ReportCategory, number> = {} as any;
  const splitDist: Record<DatasetSplit, number> = { train: 0, validation: 0, test: 0 };
  
  for (const e of datasetEntries) {
    categoryDist[e.trueCategory] = (categoryDist[e.trueCategory] || 0) + 1;
    splitDist[e.split]++;
  }

  datasetVersions = [{
    version: '1.0.0',
    entryCount: datasetEntries.length,
    categoryDistribution: categoryDist,
    splitDistribution: splitDist,
    createdAt: new Date().toISOString(),
    notes: 'Initial seed dataset with 50 curated examples across 8 categories'
  }];

  datasetInitialized = true;
}

export function getDatasetEntries(filters?: { 
  category?: ReportCategory; 
  split?: DatasetSplit; 
  source?: string;
  limit?: number;
  offset?: number;
}): CivicDatasetEntry[] {
  initializeDataset();
  
  let result = datasetEntries;
  
  if (filters?.category) {
    result = result.filter(e => e.trueCategory === filters.category);
  }
  if (filters?.split) {
    result = result.filter(e => e.split === filters.split);
  }
  if (filters?.source) {
    result = result.filter(e => e.source === filters.source);
  }
  
  if (filters?.offset) {
    result = result.slice(filters.offset);
  }
  if (filters?.limit) {
    result = result.slice(0, filters.limit);
  }
  
  return result;
}

export function getDatasetVersion(version?: string): DatasetVersion | undefined {
  initializeDataset();
  const ver = version || currentDatasetVersion;
  return datasetVersions.find(v => v.version === ver);
}

export function getAllDatasetVersions(): DatasetVersion[] {
  initializeDataset();
  return [...datasetVersions];
}

export function getDatasetStats() {
  initializeDataset();
  const entries = datasetEntries;
  const byCategory: Record<string, number> = {};
  const bySplit: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  const byUrgency: Record<string, number> = {};

  for (const e of entries) {
    byCategory[e.trueCategory] = (byCategory[e.trueCategory] || 0) + 1;
    bySplit[e.split] = (bySplit[e.split] || 0) + 1;
    bySource[e.source] = (bySource[e.source] || 0) + 1;
    byUrgency[e.urgency] = (byUrgency[e.urgency] || 0) + 1;
  }

  return {
    totalEntries: entries.length,
    version: currentDatasetVersion,
    categoryDistribution: byCategory,
    splitDistribution: bySplit,
    sourceDistribution: bySource,
    urgencyDistribution: byUrgency,
    versions: datasetVersions.length
  };
}

export function addDatasetEntry(entry: Omit<CivicDatasetEntry, 'id' | 'createdAt'>): CivicDatasetEntry {
  initializeDataset();
  
  const newEntry: CivicDatasetEntry = {
    ...entry,
    id: `DS-${String(datasetEntries.length + 1).padStart(4, '0')}`,
    text: `${entry.title} ${entry.description}`,
    createdAt: new Date().toISOString()
  };
  
  datasetEntries.push(newEntry);
  return newEntry;
}

export function bulkAddDatasetEntries(entries: Omit<CivicDatasetEntry, 'id' | 'createdAt'>[]): CivicDatasetEntry[] {
  return entries.map(e => addDatasetEntry(e));
}

export function updateDatasetEntry(id: string, updates: Partial<CivicDatasetEntry>): CivicDatasetEntry | null {
  initializeDataset();
  const idx = datasetEntries.findIndex(e => e.id === id);
  if (idx === -1) return null;
  
  datasetEntries[idx] = { ...datasetEntries[idx], ...updates, text: `${updates.title || datasetEntries[idx].title} ${updates.description || datasetEntries[idx].description}` };
  return datasetEntries[idx];
}

export function deleteDatasetEntry(id: string): boolean {
  initializeDataset();
  const idx = datasetEntries.findIndex(e => e.id === id);
  if (idx === -1) return false;
  datasetEntries.splice(idx, 1);
  return true;
}

export function createDatasetVersion(version: string, notes?: string): DatasetVersion {
  initializeDataset();
  
  const categoryDist: Record<ReportCategory, number> = {} as any;
  const splitDist: Record<DatasetSplit, number> = { train: 0, validation: 0, test: 0 };
  
  for (const e of datasetEntries) {
    categoryDist[e.trueCategory] = (categoryDist[e.trueCategory] || 0) + 1;
    splitDist[e.split]++;
  }

  const newVersion: DatasetVersion = {
    version,
    entryCount: datasetEntries.length,
    categoryDistribution: categoryDist,
    splitDistribution: splitDist,
    createdAt: new Date().toISOString(),
    notes
  };
  
  datasetVersions.push(newVersion);
  currentDatasetVersion = version;
  return newVersion;
}

export function evaluateModelOnDataset(modelVersion: string): DatasetQualityMetrics {
  initializeDataset();
  
  const testEntries = datasetEntries.filter(e => e.split === 'test');
  const trainEntries = datasetEntries.filter(e => e.split === 'train');
  
  // Evaluate on test set
  const results: LabeledExample[] = [];
  let correct = 0;
  
  for (const entry of testEntries) {
    const prediction = classifyReport(entry.text);
    const predictedCategory = prediction.predictedCategory;
    const isCorrect = predictedCategory === entry.trueCategory;
    if (isCorrect) correct++;
    
    results.push({
      id: entry.id,
      text: entry.text,
      trueCategory: entry.trueCategory,
      predictedCategory,
      confidence: prediction.confidence,
      correct: isCorrect
    });
  }
  
  // Compute per-category metrics
  const categories: ReportCategory[] = ['Water & Drainage', 'Roads & Traffic', 'Public Sanitation', 'Power & Lighting', 'Parks & Environment', 'Structural Safety', 'Public Health', 'Noise & Disturbance'];
  const perCategory = categories.map(category => {
    const catResults = results.filter(r => r.trueCategory === category);
    const catCorrect = catResults.filter(r => r.correct).length;
    const catTotal = catResults.length;
    const catPredicted = results.filter(r => r.predictedCategory === category).length;
    
    const precision = catPredicted > 0 ? results.filter(r => r.predictedCategory === category && r.correct).length / catPredicted : 0;
    const recall = catTotal > 0 ? catCorrect / catTotal : 0;
    const f1 = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
    
    return {
      category,
      entryCount: catTotal,
      precision: Number(precision.toFixed(2)),
      recall: Number(recall.toFixed(2)),
      f1: Number(f1.toFixed(2)),
      support: catTotal
    };
  });
  
  // Confusion matrix
  const confusionMatrix: { actual: ReportCategory; predicted: ReportCategory; count: number }[] = [];
  for (const actual of categories) {
    for (const predicted of categories) {
      const count = results.filter(r => r.trueCategory === actual && r.predictedCategory === predicted).length;
      if (count > 0) {
        confusionMatrix.push({ actual, predicted, count });
      }
    }
  }
  
  const overallAccuracy = testEntries.length > 0 ? correct / testEntries.length : 0;
  const macroPrecision = perCategory.reduce((sum, c) => sum + c.precision, 0) / categories.length;
  const macroRecall = perCategory.reduce((sum, c) => sum + c.recall, 0) / categories.length;
  const macroF1 = perCategory.reduce((sum, c) => sum + c.f1, 0) / categories.length;
  
  return {
    datasetName: 'SCIP Civic Dataset',
    version: currentDatasetVersion,
    totalEntries: datasetEntries.length,
    perCategory,
    macroPrecision: Number(macroPrecision.toFixed(2)),
    macroRecall: Number(macroRecall.toFixed(2)),
    macroF1: Number(macroF1.toFixed(2)),
    microPrecision: Number(overallAccuracy.toFixed(2)),
    microRecall: Number(overallAccuracy.toFixed(2)),
    microF1: Number(overallAccuracy.toFixed(2)),
    overallAccuracy: Number(overallAccuracy.toFixed(2)),
    confusionMatrix,
    evaluatedAt: new Date().toISOString(),
    modelVersion
  };
}

export function generateSyntheticExamples(count: number, category?: ReportCategory): Omit<CivicDatasetEntry, 'id' | 'createdAt'>[] {
  const templates = {
    'Water & Drainage': [
      { title: 'Water logging at {location}', description: 'Heavy rain caused water accumulation up to {depth} feet. Drain blocked by {debris}.', urgency: 'high' as UrgencyLevel },
      { title: 'Sewage overflow at {location}', description: 'Manhole overflowing with raw sewage. Bad smell and health hazard for residents.', urgency: 'critical' as UrgencyLevel },
      { title: 'Drain blockage near {location}', description: 'Storm water drain clogged with plastic waste. Water not draining during rain.', urgency: 'medium' as UrgencyLevel },
    ],
    'Roads & Traffic': [
      { title: 'Pothole on {location}', description: 'Large pothole {size} meters wide causing vehicle damage. Accident risk for two-wheelers.', urgency: 'high' as UrgencyLevel },
      { title: 'Traffic signal malfunction at {location}', description: 'All lights blinking. Traffic chaos during peak hours. No traffic police deployed.', urgency: 'high' as UrgencyLevel },
      { title: 'Road cave-in at {location}', description: 'Ground subsidence near construction. Diameter {size} meters. Barricades missing.', urgency: 'critical' as UrgencyLevel },
    ],
    'Public Sanitation': [
      { title: 'Garbage not collected at {location}', description: 'Bins overflowing for {days} days. Stray animals scattering waste. Mosquito breeding.', urgency: 'high' as UrgencyLevel },
      { title: 'Public toilet non-functional at {location}', description: 'All units broken. No water, doors missing. Open defecation forced.', urgency: 'high' as UrgencyLevel },
      { title: 'Illegal dumping at {location}', description: 'Construction debris dumped overnight. Park/road blocked. No action for weeks.', urgency: 'medium' as UrgencyLevel },
    ],
    'Power & Lighting': [
      { title: 'Transformer sparking at {location}', description: 'Loud noise and visible sparks. Voltage fluctuations damaging appliances in nearby homes.', urgency: 'critical' as UrgencyLevel },
      { title: 'Street light pole leaning at {location}', description: 'Electric pole tilted dangerously. Live wires touching trees. Children playing nearby.', urgency: 'critical' as UrgencyLevel },
      { title: 'Power outage in {location}', description: 'Daily {hours}-hour power cuts for past month. Residents suffering in heat.', urgency: 'high' as UrgencyLevel },
    ],
    'Parks & Environment': [
      { title: 'Tree cutting in {location}', description: 'Mature trees cut illegally in protected area. Timber loaded in trucks at night.', urgency: 'high' as UrgencyLevel },
      { title: 'Lake pollution at {location}', description: 'Water turning green with algal bloom. Fish dying. Sewage inflow suspected.', urgency: 'high' as UrgencyLevel },
      { title: 'Park encroachment at {location}', description: 'Permanent structures built inside municipal park. Walking tracks blocked.', urgency: 'medium' as UrgencyLevel },
    ],
    'Structural Safety': [
      { title: 'Building cracks at {location}', description: 'Wide cracks on load-bearing columns. Residents evacuated fearing collapse.', urgency: 'critical' as UrgencyLevel },
      { title: 'Wall collapse risk at {location}', description: 'High boundary wall leaning outward. Bricks falling on public footpath.', urgency: 'critical' as UrgencyLevel },
      { title: 'Bridge railing broken at {location}', description: 'Pedestrian bridge railings missing. Elderly at risk crossing open drain.', urgency: 'high' as UrgencyLevel },
    ],
    'Public Health': [
      { title: 'Mosquito breeding at {location}', description: 'Stagnant water not drained. Dengue cases rising in neighborhood. No fogging done.', urgency: 'high' as UrgencyLevel },
      { title: 'Stray dog attacks at {location}', description: 'Aggressive dog pack biting residents. Multiple hospitalizations this week.', urgency: 'high' as UrgencyLevel },
      { title: 'Unhygienic food vendor at {location}', description: 'Unlicensed vendor selling contaminated food near sensitive area.', urgency: 'medium' as UrgencyLevel },
    ],
    'Noise & Disturbance': [
      { title: 'Late night noise at {location}', description: 'Loud music till 3 AM from commercial establishment. Residents unable to sleep.', urgency: 'medium' as UrgencyLevel },
      { title: 'Industrial noise at {location}', description: 'Continuous machinery noise exceeding 90dB. Vibrations damaging nearby homes.', urgency: 'high' as UrgencyLevel },
      { title: 'Construction noise at {location}', description: 'Jackhammer work past permitted hours. Dust and noise disturbing residents.', urgency: 'medium' as UrgencyLevel },
    ],
  };
  
  const locations = [
    'Sector 5', 'Main Market', 'Ring Road', 'Green Park', 'Riverside Colony',
    'Industrial Area', 'School Zone', 'Hospital Road', 'Temple Street', 'Bus Stand'
  ];
  
  const debris = ['plastic waste', 'construction debris', 'fallen leaves', 'silt', 'garbage'];
  
  const results: Omit<CivicDatasetEntry, 'id' | 'createdAt'>[] = [];
  const targetCategories = category ? [category] : Object.keys(templates) as ReportCategory[];
  
  for (let i = 0; i < count; i++) {
    const cat = targetCategories[Math.floor(Math.random() * targetCategories.length)];
    const catTemplates = templates[cat];
    const template = catTemplates[Math.floor(Math.random() * catTemplates.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];
    const depth = Math.floor(Math.random() * 3) + 1;
    const size = (Math.random() * 2 + 1).toFixed(1);
    const days = Math.floor(Math.random() * 10) + 3;
    const hours = Math.floor(Math.random() * 6) + 2;
    
    let title = template.title.replace('{location}', location).replace('{depth}', String(depth)).replace('{size}', size);
    let description = template.description
      .replace('{location}', location)
      .replace('{depth}', String(depth))
      .replace('{size}', size)
      .replace('{days}', String(days))
      .replace('{hours}', String(hours))
      .replace('{debris}', debris[Math.floor(Math.random() * debris.length)]);
    
    results.push({
      title,
      description,
      text: `${title} ${description}`,
      trueCategory: cat,
      urgency: template.urgency,
      locationName: location,
      latitude: 28.6 + (Math.random() - 0.5) * 0.1,
      longitude: 77.2 + (Math.random() - 0.5) * 0.1,
      source: 'synthetic',
      split: 'train'
    });
  }
  
  return results;
}

export function exportDataset(format: 'json' | 'csv' = 'json'): string {
  initializeDataset();
  
  if (format === 'csv') {
    const header = 'id,title,description,category,urgency,location,latitude,longitude,source,split,createdAt\n';
    const rows = datasetEntries.map(e => [
      e.id, e.title, e.description, e.trueCategory, e.urgency, e.locationName,
      e.latitude, e.longitude, e.source, e.split, e.createdAt
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    return header + rows;
  }
  
  return JSON.stringify(datasetEntries, null, 2);
}

export const datasetService = {
  getDatasetEntries,
  getDatasetVersion,
  getAllDatasetVersions,
  getDatasetStats,
  addDatasetEntry,
  bulkAddDatasetEntries,
  updateDatasetEntry,
  deleteDatasetEntry,
  createDatasetVersion,
  evaluateModelOnDataset,
  generateSyntheticExamples,
  exportDataset
};

export default datasetService;