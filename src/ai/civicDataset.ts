// SCIP Civic Text Dataset (Phase 3)
// Labeled municipal report dataset for training, evaluation, and benchmarking
// of SCIP AI models across 8 report categories.
// All entries are synthetic/representative examples — no real PII included.

import {
  CivicDatasetEntry,
  DatasetSplit,
  DatasetVersion,
  ReportCategory,
  UrgencyLevel
} from '../types/scip.js';

const nowIso = (): string => new Date().toISOString();

const CATEGORIES: ReportCategory[] = [
  'Water & Drainage',
  'Roads & Traffic',
  'Public Sanitation',
  'Power & Lighting',
  'Parks & Environment',
  'Structural Safety',
  'Public Health',
  'Noise & Disturbance'
];

// Location pool used across entries (Delhi NCR representative)
const LOCATIONS = [
  { name: 'Sector 4 Market Entrance', lat: 28.6142, lng: 77.2091, state: 'IN-UT-DL', district: 'IN-DIST-DL-01', locality: 'IN-LOC-DL-01', pin: '110001' },
  { name: 'Sector 7 Junction', lat: 28.6250, lng: 77.2180, state: 'IN-UT-DL', district: 'IN-DIST-DL-02', locality: 'IN-LOC-DL-01', pin: '110001' },
  { name: 'West Boulevard Avenue', lat: 28.6247, lng: 77.2178, state: 'IN-UT-DL', district: 'IN-DIST-DL-02', locality: undefined, pin: undefined },
  { name: 'Central Plaza Food Street', lat: 28.6100, lng: 77.2050, state: 'IN-UT-DL', district: 'IN-DIST-DL-01', locality: undefined, pin: undefined },
  { name: 'Riverfront Canal Footbridge', lat: 28.6180, lng: 77.2120, state: 'IN-UT-DL', district: 'IN-DIST-DL-03', locality: undefined, pin: undefined },
  { name: 'North Industrial Expressway Ramp B', lat: 28.6382, lng: 77.2302, state: 'IN-ST-HR', district: 'IN-DIST-HR-01', locality: undefined, pin: undefined },
  { name: 'School Road, Near City Public School', lat: 28.6105, lng: 77.2054, state: 'IN-UT-DL', district: 'IN-DIST-DL-01', locality: undefined, pin: undefined },
  { name: 'Sector 12 Residential Edge', lat: 28.6350, lng: 77.2280, state: 'IN-ST-HR', district: 'IN-DIST-HR-01', locality: undefined, pin: undefined },
  { name: 'Sub-City Sector 9 Commercial Plot', lat: 28.6120, lng: 77.2070, state: 'IN-ST-HR', district: 'IN-DIST-HR-01', locality: undefined, pin: undefined },
  { name: 'Connaught Place', lat: 28.6289, lng: 77.2168, state: 'IN-UT-DL', district: 'IN-DIST-DL-01', locality: 'IN-LOC-DL-01', pin: '110001' },
  { name: 'Karol Bagh Market', lat: 28.6527, lng: 77.1878, state: 'IN-UT-DL', district: 'IN-DIST-DL-03', locality: 'IN-LOC-DL-02', pin: '110005' },
  { name: 'Bengaluru North Taluka', lat: 13.0827, lng: 80.2707, state: 'IN-ST-KA', district: 'IN-DIST-KA-01', locality: undefined, pin: undefined },
  { name: 'Mumbai Fort', lat: 18.9374, lng: 72.8341, state: 'IN-ST-MH', district: 'IN-DIST-MH-01', locality: 'IN-LOC-MH-01', pin: '400001' },
  { name: 'Pune City Center', lat: 18.5204, lng: 73.8567, state: 'IN-ST-MH', district: 'IN-DIST-MH-02', locality: undefined, pin: undefined },
  { name: 'Chennai Central', lat: 13.0827, lng: 80.2707, state: 'IN-ST-TN', district: 'IN-DIST-TN-01', locality: 'IN-LOC-TN-01', pin: '600001' },
  { name: 'Hyderabad City Center', lat: 17.3850, lng: 78.4867, state: 'IN-ST-TG', district: 'IN-DIST-TG-01', locality: undefined, pin: undefined },
  { name: 'Kolkata Central', lat: 22.5726, lng: 88.3639, state: 'IN-ST-WB', district: 'IN-DIST-WB-01', locality: undefined, pin: undefined },
  { name: 'Lucknow Hazratganj', lat: 26.8467, lng: 80.9462, state: 'IN-ST-UP', district: 'IN-DIST-UP-01', locality: 'IN-LOC-UP-01', pin: '226001' },
  { name: 'Ahmedabad City Center', lat: 23.0225, lng: 72.5714, state: 'IN-ST-GJ', district: 'IN-DIST-GJ-01', locality: undefined, pin: undefined },
  { name: 'Jaipur City Center', lat: 26.9124, lng: 75.7873, state: 'IN-ST-RJ', district: 'IN-DIST-RJ-01', locality: undefined, pin: undefined }
];

const random = (min: number, max: number): number => Math.random() * (max - min) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const pickSome = <T>(arr: T[], count: number): T[] => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Deterministic seed for reproducible dataset
const seededRandom = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

// Build labeled entries per category
const buildCategoryEntries = (
  category: ReportCategory,
  countPerSplit: { train: number; test: number; validation: number },
  seed: number
): CivicDatasetEntry[] => {
  const rnd = seededRandom(seed);
  const entries: CivicDatasetEntry[] = [];
  let id = 0;

  const categoryTemplates: Record<ReportCategory, { title: string; description: string; urgency: UrgencyLevel }[]> = {
    'Water & Drainage': [
      { title: 'Waterlogging outside market entrance', description: 'Heavy rain has caused water to accumulate outside the main market entrance. The water is stagnant and about 6-8 inches deep, blocking pedestrian access.', urgency: 'high' },
      { title: 'Blocked storm drain near residential street', description: 'The stormwater drain is completely clogged with plastic waste and silt. Water is backflowing onto the road during rain.', urgency: 'high' },
      { title: 'Sewage overflow in apartment complex', description: 'Sewage is overflowing from the municipal sewer line into the apartment complex courtyard. Foul smell and health hazard for residents.', urgency: 'critical' },
      { title: 'Stagnant water in open drainage ditch', description: 'Open drainage ditch along the roadside has stagnant water for over a week. Mosquito breeding site and odor problem.', urgency: 'medium' },
      { title: 'Clogged culvert under bridge', description: 'The culvert under the bridge is blocked with debris. Rainwater is not draining and is pooling on the road surface.', urgency: 'high' }
    ],
    'Roads & Traffic': [
      { title: 'Large pothole on arterial road', description: 'A deep pothole measuring approximately 3 feet wide has formed on the arterial road. Vehicles are swerving to avoid it, causing near-accidents.', urgency: 'high' },
      { title: 'Traffic signal malfunction at junction', description: 'The traffic signal at the main junction is not working. Vehicles are crossing without control, creating a dangerous situation.', urgency: 'critical' },
      { title: 'Broken asphalt surface near school', description: 'The road surface near the school gate is broken with loose gravel and cracks. Children walking to school are at risk of tripping.', urgency: 'medium' },
      { title: 'Congestion at roundabout during peak hours', description: 'Severe traffic congestion at the roundabout during morning and evening peak hours. Vehicles are stuck for over 30 minutes.', urgency: 'medium' },
      { title: 'Missing speed breaker on residential street', description: 'The speed breaker on the residential street is missing. Vehicles are overspeeding, endangering pedestrians and children.', urgency: 'low' }
    ],
    'Public Sanitation': [
      { title: 'Garbage bin overflowing in commercial area', description: 'The municipal garbage bin has not been emptied for 5 days. Waste is spilling onto the street and attracting stray animals.', urgency: 'medium' },
      { title: 'Illegal waste dumping on vacant plot', description: 'Household and construction waste is being dumped on the vacant plot near the residential area. Foul smell and unsanitary conditions.', urgency: 'medium' },
      { title: 'Uncollected domestic waste in neighborhood', description: 'Domestic waste has not been collected from the neighborhood for 4 days. Bags are piled up outside houses.', urgency: 'medium' },
      { title: 'Public toilet not maintained', description: 'The public toilet near the bus stand is not cleaned regularly. Unhygienic conditions and bad smell.', urgency: 'low' },
      { title: 'Plastic waste clogging storm inlet', description: 'Plastic bags and refuse are clogging the storm water inlet near the school. Rain water is not draining properly.', urgency: 'high' }
    ],
    'Power & Lighting': [
      { title: 'Streetlights dark on main avenue', description: 'All streetlights along the 500m avenue have been dark for 3 nights. Dangerous driving conditions after sunset.', urgency: 'high' },
      { title: 'Transformer sparking near residential area', description: 'The overhead transformer pole is sparking violently with loud buzzing. Immediate electrocution risk to pedestrians.', urgency: 'critical' },
      { title: 'Hanging electrical wire low over road', description: 'An electrical wire is hanging low over the road after the storm. Vehicles and pedestrians are at risk.', urgency: 'critical' },
      { title: 'Power outage in residential block', description: 'The residential block has had no power for 12 hours. Residents are without lighting and fans during hot weather.', urgency: 'high' },
      { title: 'Streetlight pole leaning dangerously', description: 'The streetlight pole is leaning at a dangerous angle after being hit by a vehicle. Risk of collapse.', urgency: 'high' }
    ],
    'Parks & Environment': [
      { title: 'Fallen tree branch across walking path', description: 'A large tree branch has fallen across the walking path in the park. Joggers and walkers are obstructed.', urgency: 'medium' },
      { title: 'Overgrown grass in public park', description: 'The grass in the public park is overgrown and not trimmed. Snakes and insects are visible in the area.', urgency: 'low' },
      { title: 'Tree infested with pests near school', description: 'The old tree near the school gate is infested with pests. Branches are falling and could injure children.', urgency: 'medium' },
      { title: 'Park bench damaged and unsafe', description: 'The park bench near the entrance is damaged with broken slats. Unsafe for senior citizens to use.', urgency: 'low' },
      { title: 'Lake water stagnant and algae-covered', description: 'The water in the park lake is stagnant and covered with algae. Foul smell and mosquito breeding.', urgency: 'medium' }
    ],
    'Structural Safety': [
      { title: 'Crack in compound wall near school', description: 'A large crack has appeared in the compound wall of the school. Risk of collapse during heavy rain or wind.', urgency: 'high' },
      { title: 'Bridge railing collapsed into canal', description: 'A section of the bridge railing has collapsed into the canal below. Severe fall hazard for pedestrians.', urgency: 'critical' },
      { title: 'Dilapidated building ceiling falling', description: 'Plaster and ceiling material are falling from the dilapidated building. Pedestrians walking below are at risk.', urgency: 'critical' },
      { title: 'Loose scaffolding on construction site', description: 'The scaffolding on the construction site is loose and unstable. Risk of falling material onto the street below.', urgency: 'high' },
      { title: 'Pillar cracked in parking structure', description: 'A support pillar in the parking structure has visible cracks. Structural integrity is compromised.', urgency: 'critical' }
    ],
    'Public Health': [
      { title: 'Stagnant water mosquito breeding site', description: 'Open pit with stagnant water near residential area is a mosquito breeding site. Residents report high fever cases.', urgency: 'high' },
      { title: 'Dead animal on roadside', description: 'A dead animal has been lying on the roadside for 2 days. Foul smell and disease risk to residents.', urgency: 'medium' },
      { title: 'Rodent infestation in market area', description: 'Rodents are infesting the market area shops and garbage bins. Food contamination risk.', urgency: 'medium' },
      { title: 'Stray dog bite incidents increasing', description: 'Multiple stray dog bite incidents reported in the neighborhood over the past week. Safety risk to children.', urgency: 'high' },
      { title: 'Medical waste dumped in public bin', description: 'Medical waste including used syringes and bandages found in a public garbage bin. Serious health hazard.', urgency: 'critical' }
    ],
    'Noise & Disturbance': [
      { title: 'Loud music from night club past midnight', description: 'The night club is playing loud music past midnight, disturbing residents in nearby apartments.', urgency: 'low' },
      { title: 'Construction noise during night hours', description: 'Construction work is ongoing past 11 PM with heavy machinery noise. Residents cannot sleep.', urgency: 'medium' },
      { title: 'Generator noise in residential area', description: 'A diesel generator is running continuously in the residential area. Loud noise and vibrations.', urgency: 'low' },
      { title: 'Honking and traffic noise at junction', description: 'Continuous honking and traffic noise at the busy junction. Noise levels exceed permissible limits.', urgency: 'low' },
      { title: 'Loudspeaker use during prayer hours', description: 'Loudspeaker is being used at high volume during early morning hours. Disturbing nearby residents.', urgency: 'low' }
    ]
  };

  const templates = categoryTemplates[category];
  const total = countPerSplit.train + countPerSplit.test + countPerSplit.validation;

  for (let i = 0; i < total; i++) {
    const template = pick(templates);
    const loc = pick(LOCATIONS);
    const urgencyOptions: UrgencyLevel[] = ['low', 'medium', 'high', 'critical'];
    const urgency = template.urgency || pick(urgencyOptions);
    const split: DatasetSplit = i < countPerSplit.train
      ? 'train'
      : i < countPerSplit.train + countPerSplit.test
      ? 'test'
      : 'validation';

    entries.push({
      id: `CIVIC-${category.replace(/[^A-Za-z0-9]/g, '')}-${String(++id).padStart(4, '0')}`,
      title: template.title,
      description: template.description,
      text: `${template.title}. ${template.description}`,
      trueCategory: category,
      urgency,
      locationName: loc.name,
      latitude: Number((loc.lat + rnd() * 0.005 - 0.0025).toFixed(6)),
      longitude: Number((loc.lng + rnd() * 0.005 - 0.0025).toFixed(6)),
      source: i % 3 === 0 ? 'synthetic' : i % 3 === 1 ? 'seed' : 'crowd',
      split,
      stateId: loc.state,
      districtId: loc.district,
      localityId: loc.locality,
      pinCode: loc.pin,
      createdAt: nowIso()
    });
  }

  return entries;
};

const countsPerSplit = { train: 25, test: 10, validation: 5 };

const allEntries: CivicDatasetEntry[] = [];
for (const cat of CATEGORIES) {
  allEntries.push(...buildCategoryEntries(cat, countsPerSplit, CATEGORIES.indexOf(cat) * 1000 + 42));
}

// Shuffle deterministically for split integrity
allEntries.sort(() => 0.5 - 0.5);

const entryCount = allEntries.length;
const categoryDistribution = CATEGORIES.reduce((acc: Record<ReportCategory, number>, cat) => {
  acc[cat] = allEntries.filter(e => e.trueCategory === cat).length;
  return acc;
}, {} as Record<ReportCategory, number>);
const splitDistribution = { train: 0, test: 0, validation: 0 } as Record<DatasetSplit, number>;
for (const e of allEntries) splitDistribution[e.split]++;

export const CIVIC_TEXT_DATASET_V1: CivicDatasetEntry[] = allEntries;

export const CIVIC_TEXT_DATASET_VERSION_1_0_0: DatasetVersion = {
  version: '1.0.0',
  entryCount,
  categoryDistribution,
  splitDistribution,
  createdAt: nowIso(),
  notes: 'Initial civic text dataset with 8 municipal report categories. Synthetic labeled examples for training and evaluation.'
};

// Export convenience accessors
export const getDatasetEntries = (split?: DatasetSplit): CivicDatasetEntry[] =>
  split ? allEntries.filter(e => e.split === split) : allEntries;

export const getDatasetEntriesByCategory = (category: ReportCategory): CivicDatasetEntry[] =>
  allEntries.filter(e => e.trueCategory === category);

export const getDatasetVersion = (): DatasetVersion => CIVIC_TEXT_DATASET_VERSION_1_0_0;

export const CIVIC_DATASET_NAME = 'scip-civic-text-dataset';
