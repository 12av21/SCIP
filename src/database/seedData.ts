// SCIP Database - Seed Data for Local Development & Testing
// Contains realistic municipal records, coordinates, and report clusters

import {
  Department,
  User,
  Report,
  Incident,
  AuditLog,
  Notification,
  RiskScore,
  InspectionRecord,
  AdminState,
  AdminDistrict,
  AdminSubDistrict,
  AdminBlock,
  AdminLocality,
  AdministrativeBoundary
} from '../types/scip.js';

export const SEED_DEPARTMENTS: Department[] = [
  {
    id: 'DEP-WTR',
    code: 'WSD',
    name: 'Water & Sewerage Authority',
    description: 'Responsible for municipal stormwater drainage, water supply grids, culverts, and sewer maintenance.',
    headName: 'Er. Sunita Patel',
    email: 'water.operations@scip.gov',
    phone: '+91-11-2345-6701',
    activeIncidentsCount: 3,
    createdAt: '2026-01-15T08:00:00.000Z'
  },
  {
    id: 'DEP-ROADS',
    code: 'PWD',
    name: 'Public Works & Roads Infrastructure',
    description: 'Responsible for municipal highways, arterial avenues, resurfacing, bridges, and traffic signage.',
    headName: 'Er. Vikram Sharma',
    email: 'pwd.roads@scip.gov',
    phone: '+91-11-2345-6702',
    activeIncidentsCount: 4,
    createdAt: '2026-01-15T08:00:00.000Z'
  },
  {
    id: 'DEP-SANI',
    code: 'MSW',
    name: 'Municipal Sanitation & Solid Waste',
    description: 'Manages municipal collection containers, neighborhood sweeping, waste disposal, and civic cleanliness.',
    headName: 'Smt. Anita Roy',
    email: 'sanitation@scip.gov',
    phone: '+91-11-2345-6703',
    activeIncidentsCount: 2,
    createdAt: '2026-01-15T08:00:00.000Z'
  },
  {
    id: 'DEP-ELEC',
    code: 'PPL',
    name: 'Power, Grid & Public Lighting',
    description: 'Responsible for streetlight networks, power feeder lines, municipal transformers, and electrical safety.',
    headName: 'Er. Devendra Singh',
    email: 'power.lighting@scip.gov',
    phone: '+91-11-2345-6704',
    activeIncidentsCount: 2,
    createdAt: '2026-01-15T08:00:00.000Z'
  }
];

// Pre-hashed bcrypt for 'AdminPass123!', 'DirectorPass123!', 'OfficerPass123!', 'CitizenPass123!'
// $2a$10$w6D4T8fW... or stored hashes
export const SEED_USERS: User[] = [
  {
    id: 'USR-ADMIN-01',
    name: 'Adarsh Verma',
    email: 'admin@scip.gov',
    passwordHash: '$2a$10$w1qZ3PjG2h1bFfLdJtT7UOPV2yR6j0K8u6C7vL2bZ4xPq6c7s9A2m', // AdminPass123!
    role: 'admin',
    phone: '+91-98765-43210',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'USR-AUTH-01',
    name: 'Dr. Rajesh Gupta',
    email: 'director@scip.gov',
    passwordHash: '$2a$10$w1qZ3PjG2h1bFfLdJtT7UOPV2yR6j0K8u6C7vL2bZ4xPq6c7s9A2m', // DirectorPass123!
    role: 'authority',
    phone: '+91-98765-43211',
    status: 'active',
    createdAt: '2026-01-05T09:30:00.000Z',
    updatedAt: '2026-01-05T09:30:00.000Z'
  },
  {
    id: 'USR-DEPT-01',
    name: 'Er. Sunita Patel',
    email: 'dept.patel@scip.gov',
    passwordHash: '$2a$10$w1qZ3PjG2h1bFfLdJtT7UOPV2yR6j0K8u6C7vL2bZ4xPq6c7s9A2m', // DeptPass123!
    role: 'dept_officer',
    departmentId: 'DEP-WTR',
    departmentName: 'Water & Sewerage Authority',
    phone: '+91-98765-43213',
    status: 'active',
    createdAt: '2026-01-10T11:30:00.000Z',
    updatedAt: '2026-01-10T11:30:00.000Z'
  },
  {
    id: 'USR-OFF-01',
    name: 'Vikram Sharma',
    email: 'officer.sharma@scip.gov',
    passwordHash: '$2a$10$w1qZ3PjG2h1bFfLdJtT7UOPV2yR6j0K8u6C7vL2bZ4xPq6c7s9A2m', // OfficerPass123!
    role: 'officer',
    departmentId: 'DEP-ROADS',
    departmentName: 'Public Works & Roads Infrastructure',
    phone: '+91-98765-43212',
    status: 'active',
    createdAt: '2026-01-10T11:00:00.000Z',
    updatedAt: '2026-01-10T11:00:00.000Z'
  },
  {
    id: 'USR-ANL-01',
    name: 'Dr. Kavita Rao',
    email: 'analyst.rao@scip.gov',
    passwordHash: '$2a$10$w1qZ3PjG2h1bFfLdJtT7UOPV2yR6j0K8u6C7vL2bZ4xPq6c7s9A2m', // AnalystPass123!
    role: 'analyst',
    phone: '+91-98765-43230',
    status: 'active',
    createdAt: '2026-01-12T10:00:00.000Z',
    updatedAt: '2026-01-12T10:00:00.000Z'
  },
  {
    id: 'USR-CIT-01',
    name: 'Priya Sharma',
    email: 'citizen.jane@scip.gov',
    passwordHash: '$2a$10$w1qZ3PjG2h1bFfLdJtT7UOPV2yR6j0K8u6C7vL2bZ4xPq6c7s9A2m', // CitizenPass123!
    role: 'citizen',
    phone: '+91-98765-43220',
    status: 'active',
    createdAt: '2026-02-01T14:15:00.000Z',
    updatedAt: '2026-02-01T14:15:00.000Z'
  },
  {
    id: 'USR-CIT-02',
    name: 'Rahul Mehta',
    email: 'citizen.rahul@scip.gov',
    passwordHash: '$2a$10$w1qZ3PjG2h1bFfLdJtT7UOPV2yR6j0K8u6C7vL2bZ4xPq6c7s9A2m', // CitizenPass123!
    role: 'citizen',
    phone: '+91-98765-43221',
    status: 'active',
    createdAt: '2026-02-03T16:00:00.000Z',
    updatedAt: '2026-02-03T16:00:00.000Z'
  }
];

export const SEED_REPORTS: Report[] = [
  // Cluster A: The Sector 4 Market Flooding & Drainage Breakdown
  {
    id: 'REP-2026-001',
    title: 'Water accumulation near Sector 4 Market entrance',
    description: 'Heavy water logging has accumulated right outside the main market entrance. Water level is around 8-10 inches and stagnant, making pedestrian access impossible.',
    category: 'Water & Drainage',
    subcategory: 'Water Logging',
    locationName: 'Sector 4 Market Entrance',
    latitude: 28.6142,
    longitude: 77.2091,
    citizenId: 'USR-CIT-01',
    citizenName: 'Priya Sharma',
    citizenEmail: 'citizen.jane@scip.gov',
    status: 'linked',
    urgency: 'high',
    incidentId: 'INC-2026-001',
    images: ['https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=400&q=80'],
    createdAt: '2026-10-03T07:15:00.000Z',
    updatedAt: '2026-10-03T07:20:00.000Z'
  },
  {
    id: 'REP-2026-002',
    title: 'Main stormwater drain blocked near Sector 4 Market',
    description: 'The municipal storm sewer culvert opposite Gate 2 is completely clogged with discarded plastic packaging and silt. Water is backflowing onto the carriageway.',
    category: 'Water & Drainage',
    subcategory: 'Clogged Drain',
    locationName: 'Sector 4 Market Gate 2',
    latitude: 28.6145,
    longitude: 77.2094,
    citizenId: 'USR-CIT-02',
    citizenName: 'Rahul Mehta',
    citizenEmail: 'citizen.rahul@scip.gov',
    status: 'linked',
    urgency: 'high',
    incidentId: 'INC-2026-001',
    images: [],
    createdAt: '2026-10-03T07:45:00.000Z',
    updatedAt: '2026-10-03T07:50:00.000Z'
  },
  {
    id: 'REP-2026-003',
    title: 'Road flooded outside State Bank branch Sector 4',
    description: 'Arterial road surface is submerged under knee-deep water. At least two compact hatchbacks have stalled in the middle of the flooded road trying to cross.',
    category: 'Roads & Traffic',
    subcategory: 'Road Flooding',
    locationName: 'Sector 4 Market Road, Bank Complex',
    latitude: 28.6140,
    longitude: 77.2088,
    citizenId: 'USR-CIT-01',
    citizenName: 'Priya Sharma',
    citizenEmail: 'citizen.jane@scip.gov',
    status: 'linked',
    urgency: 'critical',
    incidentId: 'INC-2026-001',
    createdAt: '2026-10-03T08:10:00.000Z',
    updatedAt: '2026-10-03T08:15:00.000Z'
  },
  {
    id: 'REP-2026-004',
    title: 'Severe traffic disruption and gridlock on Market Road',
    description: 'Vehicles cannot pass due to deep standing water and blocked drainage culvert. Traffic backup extends over 1.2 kilometers toward the main roundabout.',
    category: 'Roads & Traffic',
    subcategory: 'Traffic Congestion',
    locationName: 'Sector 4 Market Roundabout Approach',
    latitude: 28.6138,
    longitude: 77.2096,
    citizenId: 'USR-CIT-02',
    citizenName: 'Rahul Mehta',
    citizenEmail: 'citizen.rahul@scip.gov',
    status: 'linked',
    urgency: 'high',
    incidentId: 'INC-2026-001',
    createdAt: '2026-10-03T08:35:00.000Z',
    updatedAt: '2026-10-03T08:40:00.000Z'
  },

  // Cluster B: West Boulevard Electrical Hazard
  {
    id: 'REP-2026-005',
    title: 'Heavy tree branch snapped onto high tension powerline',
    description: 'A large banyan tree branch broke during early morning winds and is hanging directly across the 11kV electrical distribution wires on West Boulevard.',
    category: 'Parks & Environment',
    subcategory: 'Fallen Tree Branch',
    locationName: 'West Boulevard, Near Pillar 42',
    latitude: 28.6250,
    longitude: 77.2180,
    citizenId: 'USR-CIT-01',
    citizenName: 'Priya Sharma',
    citizenEmail: 'citizen.jane@scip.gov',
    status: 'assigned',
    urgency: 'critical',
    incidentId: 'INC-2026-002',
    createdAt: '2026-10-02T18:20:00.000Z',
    updatedAt: '2026-10-02T19:00:00.000Z'
  },
  {
    id: 'REP-2026-006',
    title: 'Continuous electrical sparking from transformer pole',
    description: 'The overhead transformer pole next to the fallen branch is sparking violently with loud buzzing sounds. Immediate electrocution risk to pedestrians.',
    category: 'Power & Lighting',
    subcategory: 'Transformer Sparking',
    locationName: 'West Boulevard Transformer 14',
    latitude: 28.6253,
    longitude: 77.2184,
    citizenId: 'USR-CIT-02',
    citizenName: 'Rahul Mehta',
    citizenEmail: 'citizen.rahul@scip.gov',
    status: 'assigned',
    urgency: 'critical',
    incidentId: 'INC-2026-002',
    createdAt: '2026-10-02T18:40:00.000Z',
    updatedAt: '2026-10-02T19:00:00.000Z'
  },
  {
    id: 'REP-2026-007',
    title: 'Entire stretch of streetlights dark on West Boulevard',
    description: 'Following the transformer sparks, all 16 sodium streetlamps along the 500m avenue have gone completely dark, creating dangerous night driving conditions.',
    category: 'Power & Lighting',
    subcategory: 'Streetlight Outage',
    locationName: 'West Boulevard Avenue',
    latitude: 28.6247,
    longitude: 77.2178,
    citizenId: 'USR-CIT-01',
    citizenName: 'Priya Sharma',
    citizenEmail: 'citizen.jane@scip.gov',
    status: 'assigned',
    urgency: 'medium',
    incidentId: 'INC-2026-002',
    createdAt: '2026-10-02T19:15:00.000Z',
    updatedAt: '2026-10-02T19:20:00.000Z'
  },

  // Cluster C: North Industrial Expressway Potholes (Resolved)
  {
    id: 'REP-2026-008',
    title: 'Dangerous deep crater pothole on Expressway Ramp',
    description: 'Pothole measuring approximately 4 feet wide and 6 inches deep on the expressway descent. Vehicles are swerving abruptly to avoid damage.',
    category: 'Roads & Traffic',
    subcategory: 'Pothole Crater',
    locationName: 'North Industrial Expressway Ramp B',
    latitude: 28.6380,
    longitude: 77.2300,
    citizenId: 'USR-CIT-02',
    citizenName: 'Rahul Mehta',
    citizenEmail: 'citizen.rahul@scip.gov',
    status: 'resolved',
    urgency: 'high',
    incidentId: 'INC-2026-003',
    createdAt: '2026-09-28T09:00:00.000Z',
    updatedAt: '2026-09-30T17:00:00.000Z'
  },
  {
    id: 'REP-2026-009',
    title: 'Motorcycle slipped on broken road surface near Industrial Gate',
    description: 'Loose gravel and broken asphalt from the large pothole caused a two-wheeler to skid. The rider suffered minor abrasions. Urgent patch work needed.',
    category: 'Roads & Traffic',
    subcategory: 'Road Hazard',
    locationName: 'North Industrial Expressway, Gate 1',
    latitude: 28.6384,
    longitude: 77.2305,
    citizenId: 'USR-CIT-01',
    citizenName: 'Priya Sharma',
    citizenEmail: 'citizen.jane@scip.gov',
    status: 'resolved',
    urgency: 'high',
    incidentId: 'INC-2026-003',
    createdAt: '2026-09-28T10:30:00.000Z',
    updatedAt: '2026-09-30T17:00:00.000Z'
  },

  // Independent Active Reports (Awaiting linkage / standalone)
  {
    id: 'REP-2026-010',
    title: 'Commercial garbage dumpster overflowing into pedestrian lane',
    description: 'The municipal bin has not been cleared for 4 days. Waste is spilling over 20 meters down the lane, producing an unbearable foul smell and attracting stray animals.',
    category: 'Public Sanitation',
    subcategory: 'Overflowing Bin',
    locationName: 'Central Plaza Food Street',
    latitude: 28.6100,
    longitude: 77.2050,
    citizenId: 'USR-CIT-01',
    citizenName: 'Priya Sharma',
    citizenEmail: 'citizen.jane@scip.gov',
    status: 'analyzed',
    urgency: 'medium',
    createdAt: '2026-10-02T11:00:00.000Z',
    updatedAt: '2026-10-02T11:05:00.000Z'
  },
  {
    id: 'REP-2026-011',
    title: 'Uncollected plastic debris obstructing stormwater inlet near School',
    description: 'Bags of household refuse dumped directly on top of the rainwater intake grate outside City Public School. Rain predicted tomorrow.',
    category: 'Public Sanitation',
    subcategory: 'Illegal Waste Dumping',
    locationName: 'School Road, Near City Public School',
    latitude: 28.6105,
    longitude: 77.2054,
    citizenId: 'USR-CIT-02',
    citizenName: 'Rahul Mehta',
    citizenEmail: 'citizen.rahul@scip.gov',
    status: 'analyzed',
    urgency: 'medium',
    createdAt: '2026-10-02T13:20:00.000Z',
    updatedAt: '2026-10-02T13:25:00.000Z'
  },
  {
    id: 'REP-2026-012',
    title: 'Damaged pedestrian bridge railing over drainage canal',
    description: 'A 4-meter section of the iron safety railing has rusted through and collapsed into the canal. Severe fall hazard for school children and night pedestrians.',
    category: 'Structural Safety',
    subcategory: 'Broken Railing',
    locationName: 'Riverfront Canal Footbridge',
    latitude: 28.6180,
    longitude: 77.2120,
    citizenId: 'USR-CIT-01',
    citizenName: 'Priya Sharma',
    citizenEmail: 'citizen.jane@scip.gov',
    status: 'under_review',
    urgency: 'high',
    createdAt: '2026-10-01T15:45:00.000Z',
    updatedAt: '2026-10-01T16:00:00.000Z'
  },
  {
    id: 'REP-2026-013',
    title: 'Industrial diesel generator exceeding permitted decibels at night',
    description: 'Heavy construction generator operating continuously past 11:30 PM exceeding residential noise standards. Vibrations felt in adjacent apartments.',
    category: 'Noise & Disturbance',
    subcategory: 'Night Construction Noise',
    locationName: 'Sector 12 Residential Edge',
    latitude: 28.6350,
    longitude: 77.2280,
    citizenId: 'USR-CIT-02',
    citizenName: 'Rahul Mehta',
    citizenEmail: 'citizen.rahul@scip.gov',
    status: 'analyzed',
    urgency: 'low',
    createdAt: '2026-10-02T23:30:00.000Z',
    updatedAt: '2026-10-02T23:35:00.000Z'
  },
  {
    id: 'REP-2026-014',
    title: 'Stagnant water and heavy mosquito breeding in open basement pit',
    description: 'Abandoned commercial construction basement has 3 feet of green stagnant water. Nearby residents report high incidence of viral fever.',
    category: 'Public Health',
    subcategory: 'Mosquito Vector Breeding',
    locationName: 'Sub-City Sector 9 Commercial Plot',
    latitude: 28.6120,
    longitude: 77.2070,
    citizenId: 'USR-CIT-01',
    citizenName: 'Priya Sharma',
    citizenEmail: 'citizen.jane@scip.gov',
    status: 'under_review',
    urgency: 'high',
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:15:00.000Z'
  }
];

export const SEED_INCIDENTS: Incident[] = [
  {
    id: 'INC-2026-001',
    title: 'Potential Incident: Concentrated Drainage Failure & Road Flooding at Sector 4 Market',
    category: 'Water & Drainage',
    description: 'Algorithmic correlation identified 4 distinct community reports submitted within a 150m perimeter within 90 minutes. Stagnant stormwater and blocked storm culverts have induced arterial road submergence and gridlock on Market Road.',
    locationName: 'Sector 4 Market Commercial Corridor',
    latitude: 28.6141,
    longitude: 77.2092,
    radiusMeters: 180,
    reportIds: ['REP-2026-001', 'REP-2026-002', 'REP-2026-003', 'REP-2026-004'],
    severity: 'critical',
    priority: 'P1_CRITICAL',
    confidence: 0.92,
    status: 'potential',
    isAIGenerated: true,
    humanReviewed: false,
    evidence: [
      '4 correlated observations reported within a 150m perimeter in under 1.5 hours',
      'Cascade relationship: Clogged storm culvert (REP-002) directly causing road flooding (REP-003) and traffic gridlock (REP-004)',
      'High physical hazard: Stalled vehicles reported submerged; pedestrian access blocked',
      'Historical recurrence: Sector 4 identified as repeat low-lying drainage choke point'
    ],
    createdAt: '2026-10-03T08:45:00.000Z',
    updatedAt: '2026-10-03T08:45:00.000Z'
  },
  {
    id: 'INC-2026-002',
    title: 'West Boulevard Fallen Tree Branch & Electrical Sparking Hazard',
    category: 'Power & Lighting',
    description: 'Severe storm damage caused heavy branch collapse across 11kV distribution line, triggering transformer sparking and consecutive blackout of 16 streetlights.',
    locationName: 'West Boulevard, Sector 7 Junction',
    latitude: 28.6251,
    longitude: 77.2181,
    radiusMeters: 120,
    reportIds: ['REP-2026-005', 'REP-2026-006', 'REP-2026-007'],
    severity: 'critical',
    priority: 'P1_CRITICAL',
    confidence: 0.95,
    status: 'in_progress',
    isAIGenerated: true,
    humanReviewed: true,
    reviewedBy: 'Dr. Rajesh Gupta (Director)',
    reviewedAt: '2026-10-02T19:30:00.000Z',
    reviewNotes: 'Confirmed by Municipal Control Room. Emergency electrical team dispatched to de-energize feeder line and clear branch.',
    assignedDepartmentId: 'DEP-ELEC',
    assignedDepartmentName: 'Power, Grid & Public Lighting',
    assignedOfficerId: 'USR-OFF-01',
    assignedOfficerName: 'Er. Vikram Sharma',
    evidence: [
      '3 community reports documenting electrical hazard, active sparks, and blackout',
      'Emergency verification: Live 11kV wire contact confirmed'
    ],
    createdAt: '2026-10-02T19:00:00.000Z',
    updatedAt: '2026-10-02T19:30:00.000Z'
  },
  {
    id: 'INC-2026-003',
    title: 'North Industrial Expressway Ramp Pothole Hazard & Surface Restoration',
    category: 'Roads & Traffic',
    description: 'Deep road depression and loose asphalt on industrial transit arterial causing vehicle damage and two-wheeler skidding risk.',
    locationName: 'North Industrial Expressway Ramp B',
    latitude: 28.6382,
    longitude: 77.2302,
    radiusMeters: 90,
    reportIds: ['REP-2026-008', 'REP-2026-009'],
    severity: 'high',
    priority: 'P2_HIGH',
    confidence: 0.89,
    status: 'resolved',
    isAIGenerated: true,
    humanReviewed: true,
    reviewedBy: 'Er. Vikram Sharma',
    reviewedAt: '2026-09-28T11:00:00.000Z',
    assignedDepartmentId: 'DEP-ROADS',
    assignedDepartmentName: 'Public Works & Roads Infrastructure',
    assignedOfficerId: 'USR-OFF-01',
    assignedOfficerName: 'Er. Vikram Sharma',
    resolutionNotes: 'Rapid asphalt cold mix compaction completed. 4m x 2m section resurfaced and leveled. Traffic signage restored.',
    resolvedAt: '2026-09-30T17:00:00.000Z',
    evidence: [
      '2 reports of vehicle damage and skid on high-speed expressway ramp',
      'Work order WO-2026-449 executed with cold mix asphalt'
    ],
    createdAt: '2026-09-28T10:45:00.000Z',
    updatedAt: '2026-09-30T17:00:00.000Z'
  }
];

export const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: 'NOTIF-01',
    userId: 'USR-CIT-01',
    title: 'Report Analyzed',
    message: 'Your report REP-2026-001 (Water accumulation) was analyzed by SCIP and linked to Potential Incident INC-2026-001.',
    type: 'report_status',
    read: false,
    link: 'REP-2026-001',
    createdAt: '2026-10-03T07:25:00.000Z'
  },
  {
    id: 'NOTIF-02',
    userId: 'USR-AUTH-01',
    title: 'New Potential Incident Detected',
    message: 'SCIP Intelligence Agent detected Potential Incident INC-2026-001 (Drainage Failure at Sector 4 Market) with 4 linked observations.',
    type: 'incident_alert',
    read: false,
    link: 'INC-2026-001',
    createdAt: '2026-10-03T08:45:00.000Z'
  },
  {
    id: 'NOTIF-03',
    userId: 'USR-OFF-01',
    title: 'Incident Assigned',
    message: 'You have been assigned to investigate and coordinate Incident INC-2026-002 on West Boulevard.',
    type: 'assignment',
    read: true,
    link: 'INC-2026-002',
    createdAt: '2026-10-02T19:30:00.000Z'
  }
];

export const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'AUD-001',
    action: 'LOGIN_SUCCESS',
    module: 'auth',
    userId: 'USR-ADMIN-01',
    userEmail: 'admin@scip.gov',
    userRole: 'admin',
    ipAddress: '192.168.1.101',
    details: 'Administrator logged into SCIP Enterprise Console',
    timestamp: '2026-10-03T06:00:00.000Z'
  },
  {
    id: 'AUD-002',
    action: 'REPORT_CREATED',
    module: 'reports',
    recordId: 'REP-2026-001',
    userId: 'USR-CIT-01',
    userEmail: 'citizen.jane@scip.gov',
    userRole: 'citizen',
    ipAddress: '192.168.1.150',
    details: 'Citizen submitted observation: Water accumulation near Sector 4 Market',
    timestamp: '2026-10-03T07:15:00.000Z'
  },
  {
    id: 'AUD-003',
    action: 'AI_ANALYSIS_COMPLETED',
    module: 'intelligence',
    recordId: 'REP-2026-001',
    userId: 'SYSTEM_AI',
    userEmail: 'ai.pipeline@scip.internal',
    userRole: 'admin',
    ipAddress: '127.0.0.1',
    details: 'Automated TF-IDF classification: Category "Water & Drainage" (confidence: 0.94)',
    timestamp: '2026-10-03T07:16:00.000Z'
  },
  {
    id: 'AUD-004',
    action: 'INCIDENT_DETECTED',
    module: 'incidents',
    recordId: 'INC-2026-001',
    userId: 'SYSTEM_AI',
    userEmail: 'ai.agent@scip.internal',
    userRole: 'admin',
    ipAddress: '127.0.0.1',
    details: 'DBSCAN Spatio-temporal cluster formed from 4 community reports; proposed as Potential Incident INC-2026-001',
    timestamp: '2026-10-03T08:45:00.000Z'
  },
  {
    id: 'AUD-005',
    action: 'INCIDENT_REVIEWED',
    module: 'incidents',
    recordId: 'INC-2026-002',
    userId: 'USR-AUTH-01',
    userEmail: 'director@scip.gov',
    userRole: 'authority',
    ipAddress: '192.168.1.105',
    details: 'Authority Director reviewed and confirmed AI interpretation into active municipal work order',
    timestamp: '2026-10-02T19:30:00.000Z'
  }
];

export const SEED_INSPECTIONS: InspectionRecord[] = [
  {
    id: 'INSP-2026-001',
    incidentId: 'INC-2026-001',
    officerId: 'USR-OFF-01',
    officerName: 'Vikram Sharma',
    verifiedStatus: 'verified_match',
    observations: 'On-site physical inspection confirmed severe storm sewer blockage with heavy silt and commercial plastic accumulation opposite Gate 2. Stagnant water depth measured at 9 inches.',
    checklist: {
      physicalVerification: true,
      safetyHazardAssessed: true,
      structuralDamageChecked: true,
      utilityImpactVerified: false
    },
    evidencePhotos: [
      'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=400&q=80'
    ],
    recommendedAction: 'Immediate deployment of municipal suction jetting unit and manual culvert clearing by Water & Sewerage team.',
    inspectionDate: '2026-10-03T09:30:00.000Z',
    createdAt: '2026-10-03T09:30:00.000Z',
    departmentVerified: true,
    departmentRemarks: 'Inspection verified by Department Desk Officer. Suction team dispatched under Work Order #WSD-401.',
    verifiedByOfficerId: 'USR-DEPT-01',
    verifiedByOfficerName: 'Er. Sunita Patel',
    verifiedAt: '2026-10-03T10:00:00.000Z'
  }
];

// ============================================================================
// India Administrative Location Hierarchy Seed Data
// India → State/UT → District → Sub-district/Tehsil/Taluk → Block → Village/Town/Urban Locality
// Codes use LGD-style identifiers where available. All 36 States/UTs included.
// Districts are a representative sample; full district data must be imported via
// the administrative data-import/synchronization process (not hardcoded here).
// ============================================================================

export const SEED_ADMIN_STATES: AdminState[] = [
  { id: 'IN-ST-AP', code: 'AP', name: 'Andhra Pradesh', type: 'state', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-ST-AR', code: 'AR', name: 'Arunachal Pradesh', type: 'state', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-ST-AS', code: 'AS', name: 'Assam', type: 'state', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-ST-BR', code: 'BR', name: 'Bihar', type: 'state', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-ST-CT', code: 'CT', name: 'Chhattisgarh', type: 'state', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-ST-GA', code: 'GA', name: 'Goa', type: 'state', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-ST-GJ', code: 'GJ', name: 'Gujarat', type: 'state', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-ST-HR', code: 'HR', name: 'Haryana', type: 'state', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-ST-HP', code: 'HP', name: 'Himachal Pradesh', type: 'state', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-ST-JH', code: 'JH', name: 'Jharkhand', type: 'state', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-ST-KA', code: 'KA', name: 'Karnataka', type: 'state', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-ST-KL', code: 'KL', name: 'Kerala', type: 'state', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-ST-MP', code: 'MP', name: 'Madhya Pradesh', type: 'state', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-ST-MH', code: 'MH', name: 'Maharashtra', type: 'state', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-ST-MN', code: 'MN', name: 'Manipur', type: 'state', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-ST-ML', code: 'ML', name: 'Meghalaya', type: 'state', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-ST-MZ', code: 'MZ', name: 'Mizoram', type: 'state', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-ST-NL', code: 'NL', name: 'Nagaland', type: 'state', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-ST-OR', code: 'OR', name: 'Odisha', type: 'state', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-ST-PB', code: 'PB', name: 'Punjab', type: 'state', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-ST-RJ', code: 'RJ', name: 'Rajasthan', type: 'state', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-ST-SK', code: 'SK', name: 'Sikkim', type: 'state', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-ST-TN', code: 'TN', name: 'Tamil Nadu', type: 'state', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-ST-TG', code: 'TG', name: 'Telangana', type: 'state', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-ST-TR', code: 'TR', name: 'Tripura', type: 'state', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-ST-UP', code: 'UP', name: 'Uttar Pradesh', type: 'state', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-ST-UK', code: 'UK', name: 'Uttarakhand', type: 'state', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-ST-WB', code: 'WB', name: 'West Bengal', type: 'state', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  // Union Territories
  { id: 'IN-UT-AN', code: 'AN', name: 'Andaman and Nicobar Islands', type: 'union_territory', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-UT-CH', code: 'CH', name: 'Chandigarh', type: 'union_territory', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-UT-DN', code: 'DN', name: 'Dadra and Nagar Haveli and Daman and Diu', type: 'union_territory', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-UT-DL', code: 'DL', name: 'Delhi', type: 'union_territory', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-UT-LD', code: 'LD', name: 'Lakshadweep', type: 'union_territory', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-UT-PY', code: 'PY', name: 'Puducherry', type: 'union_territory', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-UT-JK', code: 'JK', name: 'Jammu and Kashmir', type: 'union_territory', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-UT-LA', code: 'LA', name: 'Ladakh', type: 'union_territory', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
];

export const SEED_ADMIN_DISTRICTS: AdminDistrict[] = [
  // Andhra Pradesh
  { id: 'IN-DIST-AP-01', code: 'AP01', name: 'Visakhapatnam', stateId: 'IN-ST-AP', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-DIST-AP-02', code: 'AP02', name: 'Vijayawada', stateId: 'IN-ST-AP', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  // Delhi
  { id: 'IN-DIST-DL-01', code: 'DL01', name: 'Central Delhi', stateId: 'IN-UT-DL', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-DIST-DL-02', code: 'DL02', name: 'South Delhi', stateId: 'IN-UT-DL', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-DIST-DL-03', code: 'DL03', name: 'North Delhi', stateId: 'IN-UT-DL', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  // Maharashtra
  { id: 'IN-DIST-MH-01', code: 'MH01', name: 'Mumbai City', stateId: 'IN-ST-MH', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-DIST-MH-02', code: 'MH02', name: 'Pune', stateId: 'IN-ST-MH', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  // Karnataka
  { id: 'IN-DIST-KA-01', code: 'KA01', name: 'Bengaluru Urban', stateId: 'IN-ST-KA', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  // Tamil Nadu
  { id: 'IN-DIST-TN-01', code: 'TN01', name: 'Chennai', stateId: 'IN-ST-TN', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  // West Bengal
  { id: 'IN-DIST-WB-01', code: 'WB01', name: 'Kolkata', stateId: 'IN-ST-WB', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  // Uttar Pradesh
  { id: 'IN-DIST-UP-01', code: 'UP01', name: 'Lucknow', stateId: 'IN-ST-UP', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  // Rajasthan
  { id: 'IN-DIST-RJ-01', code: 'RJ01', name: 'Jaipur', stateId: 'IN-ST-RJ', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  // Gujarat
  { id: 'IN-DIST-GJ-01', code: 'GJ01', name: 'Ahmedabad', stateId: 'IN-ST-GJ', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  // Telangana
  { id: 'IN-DIST-TG-01', code: 'TG01', name: 'Hyderabad', stateId: 'IN-ST-TG', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  // Bihar
  { id: 'IN-DIST-BR-01', code: 'BR01', name: 'Patna', stateId: 'IN-ST-BR', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  // Odisha
  { id: 'IN-DIST-OR-01', code: 'OR01', name: 'Khordha', stateId: 'IN-ST-OR', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  // Punjab
  { id: 'IN-DIST-PB-01', code: 'PB01', name: 'Ludhiana', stateId: 'IN-ST-PB', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  // Haryana
  { id: 'IN-DIST-HR-01', code: 'HR01', name: 'Gurugram', stateId: 'IN-ST-HR', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  // Kerala
  { id: 'IN-DIST-KL-01', code: 'KL01', name: 'Thiruvananthapuram', stateId: 'IN-ST-KL', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  // Madhya Pradesh
  { id: 'IN-DIST-MP-01', code: 'MP01', name: 'Bhopal', stateId: 'IN-ST-MP', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
];

export const SEED_ADMIN_SUB_DISTRICTS: AdminSubDistrict[] = [
  { id: 'IN-SD-DL-01', code: 'DL01-SD1', name: 'Connaught Place', districtId: 'IN-DIST-DL-01', stateId: 'IN-UT-DL', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-SD-DL-02', code: 'DL01-SD2', name: 'Karol Bagh', districtId: 'IN-DIST-DL-01', stateId: 'IN-UT-DL', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-SD-MH-01', code: 'MH01-SD1', name: 'Mumbai City Taluka', districtId: 'IN-DIST-MH-01', stateId: 'IN-ST-MH', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-SD-KA-01', code: 'KA01-SD1', name: 'Bengaluru North Taluka', districtId: 'IN-DIST-KA-01', stateId: 'IN-ST-KA', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-SD-UP-01', code: 'UP01-SD1', name: 'Lucknow Tehsil', districtId: 'IN-DIST-UP-01', stateId: 'IN-ST-UP', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-SD-TN-01', code: 'TN01-SD1', name: 'Chennai Taluka', districtId: 'IN-DIST-TN-01', stateId: 'IN-ST-TN', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
];

export const SEED_ADMIN_BLOCKS: AdminBlock[] = [
  { id: 'IN-BLK-DL-01', code: 'DL01-BLK1', name: 'Central Delhi Block 1', subDistrictId: 'IN-SD-DL-01', districtId: 'IN-DIST-DL-01', stateId: 'IN-UT-DL', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-BLK-MH-01', code: 'MH01-BLK1', name: 'Mumbai Block 1', subDistrictId: 'IN-SD-MH-01', districtId: 'IN-DIST-MH-01', stateId: 'IN-ST-MH', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-BLK-KA-01', code: 'KA01-BLK1', name: 'Bengaluru North Block 1', subDistrictId: 'IN-SD-KA-01', districtId: 'IN-DIST-KA-01', stateId: 'IN-ST-KA', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-BLK-UP-01', code: 'UP01-BLK1', name: 'Lucknow Block 1', subDistrictId: 'IN-SD-UP-01', districtId: 'IN-DIST-UP-01', stateId: 'IN-ST-UP', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-BLK-TN-01', code: 'TN01-BLK1', name: 'Chennai Block 1', subDistrictId: 'IN-SD-TN-01', districtId: 'IN-DIST-TN-01', stateId: 'IN-ST-TN', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
];

export const SEED_ADMIN_LOCALITIES: AdminLocality[] = [
  { id: 'IN-LOC-DL-01', code: 'DL01-L1', name: 'Connaught Place', blockId: 'IN-BLK-DL-01', subDistrictId: 'IN-SD-DL-01', districtId: 'IN-DIST-DL-01', stateId: 'IN-UT-DL', type: 'urban_locality', pinCode: '110001', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-LOC-DL-02', code: 'DL01-L2', name: 'Karol Bagh', blockId: 'IN-BLK-DL-01', subDistrictId: 'IN-SD-DL-02', districtId: 'IN-DIST-DL-01', stateId: 'IN-UT-DL', type: 'urban_locality', pinCode: '110005', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-LOC-MH-01', code: 'MH01-L1', name: 'Fort Mumbai', blockId: 'IN-BLK-MH-01', subDistrictId: 'IN-SD-MH-01', districtId: 'IN-DIST-MH-01', stateId: 'IN-ST-MH', type: 'urban_locality', pinCode: '400001', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-LOC-KA-01', code: 'KA01-L1', name: 'Bengaluru North', blockId: 'IN-BLK-KA-01', subDistrictId: 'IN-SD-KA-01', districtId: 'IN-DIST-KA-01', stateId: 'IN-ST-KA', type: 'urban_locality', pinCode: '560001', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-LOC-UP-01', code: 'UP01-L1', name: 'Hazratganj', blockId: 'IN-BLK-UP-01', subDistrictId: 'IN-SD-UP-01', districtId: 'IN-DIST-UP-01', stateId: 'IN-ST-UP', type: 'urban_locality', pinCode: '226001', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-LOC-TN-01', code: 'TN01-L1', name: 'Chennai Central', blockId: 'IN-BLK-TN-01', subDistrictId: 'IN-SD-TN-01', districtId: 'IN-DIST-TN-01', stateId: 'IN-ST-TN', type: 'urban_locality', pinCode: '600001', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
];

export const SEED_ADMIN_BOUNDARIES: AdministrativeBoundary[] = [
  { id: 'IN-BDY-ST-AP', level: 'state', parentId: null, geometry: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-BDY-ST-DL', level: 'state', parentId: null, geometry: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-BDY-DIST-DL-01', level: 'district', parentId: 'IN-UT-DL', geometry: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-BDY-DIST-MH-01', level: 'district', parentId: 'IN-ST-MH', geometry: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
];
