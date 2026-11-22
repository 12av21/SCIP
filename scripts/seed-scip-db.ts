#!/usr/bin/env node
/**
 * SCIP MongoDB Seed Script
 * Seeds the real 'scip' database with development data
 * Run with: NODE_ENV=development tsx scripts/seed-scip-db.ts
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  UserModel,
  ReportModel,
  IncidentModel,
  DepartmentModel,
  ResolutionModel,
  InspectionModel,
  FeedbackModel,
  AuditLogModel,
  NotificationModel,
  CounterModel,
  AdminStateModel,
  AdminDistrictModel,
  AdminSubDistrictModel,
  AdminBlockModel,
  AdminLocalityModel,
  AdministrativeBoundaryModel,
  ClerkIdentityLinkModel,
  IPSecurityLogModel,
} from '../src/database/models/index.js';

console.log('[Seed] Models loaded successfully');

// Seed data - extracted from seedData.ts
const SEED_DEPARTMENTS = [
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

const SEED_USERS = [
  {
    id: 'USR-ADMIN-01',
    name: 'Adarsh Verma',
    email: 'admin@scip.gov',
    password: 'Admin@123',
    role: 'admin',
    phone: '+91-98765-43210',
    status: 'active',
    emailVerified: true,
    phoneVerified: true,
    verificationAttempts: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'USR-AUTH-01',
    name: 'Dr. Rajesh Gupta',
    email: 'director@scip.gov',
    password: 'Director@123',
    role: 'authority',
    phone: '+91-98765-43211',
    status: 'active',
    emailVerified: true,
    phoneVerified: true,
    verificationAttempts: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'USR-ANL-01',
    name: 'Priya Nair',
    email: 'analyst@scip.gov',
    password: 'Analyst@123',
    role: 'analyst',
    phone: '+91-98765-43212',
    status: 'active',
    emailVerified: true,
    phoneVerified: true,
    verificationAttempts: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'USR-DEPT-01',
    name: 'Rajesh Kumar',
    email: 'dept.water@scip.gov',
    password: 'Dept@123',
    role: 'dept_officer',
    departmentId: 'DEP-WTR',
    departmentName: 'Water & Sewerage Authority',
    phone: '+91-98765-43213',
    status: 'active',
    emailVerified: true,
    phoneVerified: true,
    verificationAttempts: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'USR-DEPT-02',
    name: 'Anita Sharma',
    email: 'dept.roads@scip.gov',
    password: 'Dept@123',
    role: 'dept_officer',
    departmentId: 'DEP-ROADS',
    departmentName: 'Public Works & Roads Infrastructure',
    phone: '+91-98765-43214',
    status: 'active',
    emailVerified: true,
    phoneVerified: true,
    verificationAttempts: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'USR-DEPT-03',
    name: 'Vikram Singh',
    email: 'dept.sani@scip.gov',
    password: 'Dept@123',
    role: 'dept_officer',
    departmentId: 'DEP-SANI',
    departmentName: 'Municipal Sanitation & Solid Waste',
    phone: '+91-98765-43215',
    status: 'active',
    emailVerified: true,
    phoneVerified: true,
    verificationAttempts: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'USR-DEPT-04',
    name: 'Priya Patel',
    email: 'dept.elec@scip.gov',
    password: 'Dept@123',
    role: 'dept_officer',
    departmentId: 'DEP-ELEC',
    departmentName: 'Power, Grid & Public Lighting',
    phone: '+91-98765-43216',
    status: 'active',
    emailVerified: true,
    phoneVerified: true,
    verificationAttempts: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'USR-OFF-01',
    name: 'Rohit Yadav',
    email: 'officer.water@scip.gov',
    password: 'Officer@123',
    role: 'officer',
    departmentId: 'DEP-WTR',
    departmentName: 'Water & Sewerage Authority',
    phone: '+91-98765-43217',
    status: 'active',
    emailVerified: true,
    phoneVerified: true,
    verificationAttempts: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'USR-OFF-02',
    name: 'Suresh Mehta',
    email: 'officer.roads@scip.gov',
    password: 'Officer@123',
    role: 'officer',
    departmentId: 'DEP-ROADS',
    departmentName: 'Public Works & Roads Infrastructure',
    phone: '+91-98765-43218',
    status: 'active',
    emailVerified: true,
    phoneVerified: true,
    verificationAttempts: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'USR-CIT-01',
    name: 'Arun Reddy',
    email: 'citizen1@example.com',
    password: 'Citizen@123',
    role: 'citizen',
    phone: '+91-98765-43219',
    status: 'active',
    emailVerified: true,
    phoneVerified: true,
    verificationAttempts: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'USR-CIT-02',
    name: 'Meera Joshi',
    email: 'citizen2@example.com',
    password: 'Citizen@123',
    role: 'citizen',
    phone: '+91-98765-43220',
    status: 'active',
    emailVerified: true,
    phoneVerified: true,
    verificationAttempts: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
];

const SEED_REPORTS = [
  {
    id: 'REP-2026-0001',
    title: 'Waterlogging near Sector 4 Metro Station',
    description: 'Heavy waterlogging observed near Gate 2 of Sector 4 Metro Station after overnight rain. Pedestrian pathway completely submerged. Risk of electrocution from nearby exposed wiring.',
    category: 'Water & Drainage',
    subcategory: 'Stormwater Drainage',
    locationName: 'Sector 4 Metro Station, Gate 2',
    latitude: 28.5355,
    longitude: 77.2011,
    citizenId: 'USR-CIT-01',
    citizenName: 'Arun Reddy',
    citizenEmail: 'citizen1@example.com',
    status: 'linked',
    urgency: 'critical',
    incidentId: 'INC-2026-0001',
    images: [],
    stateId: 'ST-DL',
    districtId: 'DIST-SW',
    subDistrictId: 'SD-SW-01',
    blockId: 'BLC-SW-01',
    localityId: 'LOC-SEC4',
    pinCode: '110075',
    locationSource: 'gps',
    locationAccuracyMeters: 5,
    locationConfirmedAt: '2026-07-15T08:30:00.000Z',
    address: 'Near Gate 2, Sector 4 Metro Station, Dwarka',
    landmark: 'Sector 4 Metro Station Gate 2',
    createdAt: '2026-07-15T08:30:00.000Z',
    updatedAt: '2026-07-15T08:30:00.000Z'
  },
  {
    id: 'REP-2026-0002',
    title: 'Massive pothole on Dwarka Expressway near Sector 21',
    description: 'Large pothole (approx 2ft diameter, 6in deep) on left lane of Dwarka Expressway near Sector 21 flyover. Multiple vehicles damaged. Traffic congestion building up.',
    category: 'Roads & Traffic',
    subcategory: 'Pothole Repair',
    locationName: 'Dwarka Expressway, Sector 21 Flyover',
    latitude: 28.5123,
    longitude: 77.0789,
    citizenId: 'USR-CIT-02',
    citizenName: 'Meera Joshi',
    citizenEmail: 'citizen2@example.com',
    status: 'linked',
    urgency: 'high',
    incidentId: 'INC-2026-0002',
    images: [],
    stateId: 'ST-DL',
    districtId: 'DIST-SW',
    subDistrictId: 'SD-SW-01',
    blockId: 'BLC-SW-02',
    localityId: 'LOC-SEC21',
    pinCode: '110075',
    locationSource: 'gps',
    locationAccuracyMeters: 8,
    locationConfirmedAt: '2026-07-16T09:15:00.000Z',
    address: 'Left lane, Dwarka Expressway near Sector 21 Flyover',
    landmark: 'Sector 21 Flyover',
    createdAt: '2026-07-16T09:15:00.000Z',
    updatedAt: '2026-07-16T09:15:00.000Z'
  },
  {
    id: 'REP-2026-0003',
    title: 'Garbage overflow at Sector 10 Community Center',
    description: 'Municipal waste bins at Sector 10 Community Center overflowing for 3+ days. Strong odor attracting stray animals. Requesting immediate collection and bin replacement.',
    category: 'Public Sanitation',
    subcategory: 'Waste Collection',
    locationName: 'Sector 10 Community Center',
    latitude: 28.5412,
    longitude: 77.1987,
    citizenId: 'USR-CIT-01',
    citizenName: 'Arun Reddy',
    citizenEmail: 'citizen1@example.com',
    status: 'under_review',
    urgency: 'medium',
    incidentId: 'INC-2026-0003',
    images: [],
    stateId: 'ST-DL',
    districtId: 'DIST-SW',
    subDistrictId: 'SD-SW-01',
    blockId: 'BLC-SW-01',
    localityId: 'LOC-SEC10',
    pinCode: '110075',
    locationSource: 'manual_map',
    locationAccuracyMeters: 15,
    locationConfirmedAt: '2026-07-17T10:00:00.000Z',
    address: 'Sector 10 Community Center, Dwarka',
    landmark: 'Community Center Main Gate',
    createdAt: '2026-07-17T10:00:00.000Z',
    updatedAt: '2026-07-17T10:00:00.000Z'
  }
];

const SEED_INCIDENTS = [
  {
    id: 'INC-2026-0001',
    title: 'Waterlogging & Electrocution Risk at Sector 4 Metro Station',
    category: 'Water & Drainage',
    description: 'Heavy waterlogging near Gate 2 of Sector 4 Metro Station with exposed electrical wiring creating electrocution hazard. Multiple citizen reports confirm standing water in pedestrian pathway.',
    locationName: 'Sector 4 Metro Station, Gate 2',
    latitude: 28.5355,
    longitude: 77.2011,
    radiusMeters: 100,
    reportIds: ['REP-2026-0001'],
    severity: 'critical',
    priority: 'P1_CRITICAL',
    confidence: 0.95,
    status: 'in_progress',
    isAIGenerated: true,
    humanReviewed: true,
    reviewedBy: 'USR-AUTH-01',
    reviewedAt: '2026-07-15T09:00:00.000Z',
    reviewNotes: 'Confirmed electrocution risk. Assigned to Water & Sewerage Authority for immediate pump deployment and electrical safety inspection.',
    assignedDepartmentId: 'DEP-WTR',
    assignedDepartmentName: 'Water & Sewerage Authority',
    assignedOfficerId: 'USR-OFF-01',
    assignedOfficerName: 'Rohit Yadav',
    stateId: 'ST-DL',
    districtId: 'DIST-SW',
    subDistrictId: 'SD-SW-01',
    blockId: 'BLC-SW-01',
    localityId: 'LOC-SEC4',
    createdAt: '2026-07-15T08:35:00.000Z',
    updatedAt: '2026-07-15T09:00:00.000Z'
  },
  {
    id: 'INC-2026-0002',
    title: 'Major Pothole Hazard on Dwarka Expressway at Sector 21',
    category: 'Roads & Traffic',
    description: 'Large pothole on Dwarka Expressway left lane near Sector 21 flyover causing vehicle damage and traffic congestion. Single report with high urgency.',
    locationName: 'Dwarka Expressway, Sector 21 Flyover',
    latitude: 28.5123,
    longitude: 77.0789,
    radiusMeters: 50,
    reportIds: ['REP-2026-0002'],
    severity: 'high',
    priority: 'P2_HIGH',
    confidence: 0.88,
    status: 'in_progress',
    isAIGenerated: true,
    humanReviewed: true,
    reviewedBy: 'USR-AUTH-01',
    reviewedAt: '2026-07-16T09:30:00.000Z',
    reviewNotes: 'Confirmed pothole hazard. Assigned to PWD for emergency patching and traffic management.',
    assignedDepartmentId: 'DEP-ROADS',
    assignedDepartmentName: 'Public Works & Roads Infrastructure',
    assignedOfficerId: 'USR-OFF-02',
    assignedOfficerName: 'Suresh Mehta',
    stateId: 'ST-DL',
    districtId: 'DIST-SW',
    subDistrictId: 'SD-SW-01',
    blockId: 'BLC-SW-02',
    localityId: 'LOC-SEC21',
    createdAt: '2026-07-16T09:20:00.000Z',
    updatedAt: '2026-07-16T09:30:00.000Z'
  },
  {
    id: 'INC-2026-0003',
    title: 'Sanitation Crisis at Sector 10 Community Center',
    category: 'Public Sanitation',
    description: 'Municipal waste bins overflowing for 3+ days at Sector 10 Community Center. Odor and stray animal attraction reported by local residents.',
    locationName: 'Sector 10 Community Center',
    latitude: 28.5412,
    longitude: 77.1987,
    radiusMeters: 30,
    reportIds: ['REP-2026-0003'],
    severity: 'medium',
    priority: 'P3_MEDIUM',
    confidence: 0.82,
    status: 'confirmed',
    isAIGenerated: true,
    humanReviewed: true,
    reviewedBy: 'USR-DEPT-03',
    reviewedAt: '2026-07-17T10:15:00.000Z',
    reviewNotes: 'Confirmed sanitation issue. Scheduled for immediate collection and bin capacity review.',
    assignedDepartmentId: 'DEP-SANI',
    assignedDepartmentName: 'Municipal Sanitation & Solid Waste',
    assignedOfficerId: undefined,
    assignedOfficerName: undefined,
    stateId: 'ST-DL',
    districtId: 'DIST-SW',
    subDistrictId: 'SD-SW-01',
    blockId: 'BLC-SW-01',
    localityId: 'LOC-SEC10',
    createdAt: '2026-07-17T10:05:00.000Z',
    updatedAt: '2026-07-17T10:15:00.000Z'
  }
];

// Administrative boundary seed data - from seedData.ts
const SEED_ADMIN_STATES = [
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

const SEED_ADMIN_DISTRICTS = [
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

const SEED_ADMIN_SUB_DISTRICTS = [
  { id: 'IN-SD-DL-01', code: 'DL01-SD1', name: 'Connaught Place', districtId: 'IN-DIST-DL-01', stateId: 'IN-UT-DL', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-SD-DL-02', code: 'DL01-SD2', name: 'Karol Bagh', districtId: 'IN-DIST-DL-01', stateId: 'IN-UT-DL', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-SD-MH-01', code: 'MH01-SD1', name: 'Mumbai City Taluka', districtId: 'IN-DIST-MH-01', stateId: 'IN-ST-MH', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-SD-KA-01', code: 'KA01-SD1', name: 'Bengaluru North Taluka', districtId: 'IN-DIST-KA-01', stateId: 'IN-ST-KA', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-SD-UP-01', code: 'UP01-SD1', name: 'Lucknow Tehsil', districtId: 'IN-DIST-UP-01', stateId: 'IN-ST-UP', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-SD-TN-01', code: 'TN01-SD1', name: 'Chennai Taluka', districtId: 'IN-DIST-TN-01', stateId: 'IN-ST-TN', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
];

const SEED_ADMIN_BLOCKS = [
  { id: 'IN-BLK-DL-01', code: 'DL01-BLK1', name: 'Central Delhi Block 1', subDistrictId: 'IN-SD-DL-01', districtId: 'IN-DIST-DL-01', stateId: 'IN-UT-DL', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-BLK-MH-01', code: 'MH01-BLK1', name: 'Mumbai Block 1', subDistrictId: 'IN-SD-MH-01', districtId: 'IN-DIST-MH-01', stateId: 'IN-ST-MH', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-BLK-KA-01', code: 'KA01-BLK1', name: 'Bengaluru North Block 1', subDistrictId: 'IN-SD-KA-01', districtId: 'IN-DIST-KA-01', stateId: 'IN-ST-KA', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-BLK-UP-01', code: 'UP01-BLK1', name: 'Lucknow Block 1', subDistrictId: 'IN-SD-UP-01', districtId: 'IN-DIST-UP-01', stateId: 'IN-ST-UP', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-BLK-TN-01', code: 'TN01-BLK1', name: 'Chennai Block 1', subDistrictId: 'IN-SD-TN-01', districtId: 'IN-DIST-TN-01', stateId: 'IN-ST-TN', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
];

const SEED_ADMIN_LOCALITIES = [
  { id: 'IN-LOC-DL-01', code: 'DL01-L1', name: 'Connaught Place', blockId: 'IN-BLK-DL-01', subDistrictId: 'IN-SD-DL-01', districtId: 'IN-DIST-DL-01', stateId: 'IN-UT-DL', type: 'urban_locality', pinCode: '110001', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-LOC-DL-02', code: 'DL01-L2', name: 'Karol Bagh', blockId: 'IN-BLK-DL-01', subDistrictId: 'IN-SD-DL-02', districtId: 'IN-DIST-DL-01', stateId: 'IN-UT-DL', type: 'urban_locality', pinCode: '110005', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-LOC-MH-01', code: 'MH01-L1', name: 'Fort Mumbai', blockId: 'IN-BLK-MH-01', subDistrictId: 'IN-SD-MH-01', districtId: 'IN-DIST-MH-01', stateId: 'IN-ST-MH', type: 'urban_locality', pinCode: '400001', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-LOC-KA-01', code: 'KA01-L1', name: 'Bengaluru North', blockId: 'IN-BLK-KA-01', subDistrictId: 'IN-SD-KA-01', districtId: 'IN-DIST-KA-01', stateId: 'IN-ST-KA', type: 'urban_locality', pinCode: '560001', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-LOC-UP-01', code: 'UP01-L1', name: 'Hazratganj', blockId: 'IN-BLK-UP-01', subDistrictId: 'IN-SD-UP-01', districtId: 'IN-DIST-UP-01', stateId: 'IN-ST-UP', type: 'urban_locality', pinCode: '226001', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-LOC-TN-01', code: 'TN01-L1', name: 'Chennai Central', blockId: 'IN-BLK-TN-01', subDistrictId: 'IN-SD-TN-01', districtId: 'IN-DIST-TN-01', stateId: 'IN-ST-TN', type: 'urban_locality', pinCode: '600001', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
];

const SEED_ADMIN_BOUNDARIES = [
  { id: 'IN-BDY-ST-AP', level: 'state', parentId: null, geometry: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-BDY-ST-DL', level: 'state', parentId: null, geometry: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-BDY-DIST-DL-01', level: 'district', parentId: 'IN-UT-DL', geometry: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'IN-BDY-DIST-MH-01', level: 'district', parentId: 'IN-ST-MH', geometry: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
];

async function seedDatabase() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/scip';
  
  console.log('[Seed] Connecting to MongoDB at:', mongoUri);
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log('[Seed] Connected to MongoDB successfully');

  try {
    // Clear existing collections (optional - comment out if you want to preserve existing data)
    console.log('[Seed] Clearing existing data...');
    await Promise.all([
      UserModel.deleteMany({}),
      DepartmentModel.deleteMany({}),
      ReportModel.deleteMany({}),
      IncidentModel.deleteMany({}),
      ResolutionModel.deleteMany({}),
      InspectionModel.deleteMany({}),
      FeedbackModel.deleteMany({}),
      AuditLogModel.deleteMany({}),
      NotificationModel.deleteMany({}),
      CounterModel.deleteMany({}),
      AdminStateModel.deleteMany({}),
      AdminDistrictModel.deleteMany({}),
      AdminSubDistrictModel.deleteMany({}),
      AdminBlockModel.deleteMany({}),
      AdminLocalityModel.deleteMany({}),
      AdministrativeBoundaryModel.deleteMany({}),
      ClerkIdentityLinkModel.deleteMany({}),
      IPSecurityLogModel.deleteMany({}),
    ]);
    console.log('[Seed] Existing data cleared');

    // Seed Departments
    console.log('[Seed] Seeding departments...');
    await DepartmentModel.insertMany(SEED_DEPARTMENTS);
    console.log(`[Seed] Inserted ${SEED_DEPARTMENTS.length} departments`);

    // Seed Users (with bcrypt password hashing)
    console.log('[Seed] Seeding users...');
    const hashedUsers = await Promise.all(SEED_USERS.map(async (user) => ({
      ...user,
      passwordHash: await bcrypt.hash(user.password, 10),
    })));
    await UserModel.insertMany(hashedUsers.map(({ password, ...rest }) => rest));
    console.log(`[Seed] Inserted ${SEED_USERS.length} users`);

    // Seed Reports
    console.log('[Seed] Seeding reports...');
    await ReportModel.insertMany(SEED_REPORTS);
    console.log(`[Seed] Inserted ${SEED_REPORTS.length} reports`);

    // Seed Incidents
    console.log('[Seed] Seeding incidents...');
    await IncidentModel.insertMany(SEED_INCIDENTS);
    console.log(`[Seed] Inserted ${SEED_INCIDENTS.length} incidents`);

    // Seed Administrative Boundaries
    console.log('[Seed] Seeding administrative boundaries...');
    console.log('[Seed] Seeding states...');
    await AdminStateModel.insertMany(SEED_ADMIN_STATES);
    console.log(`[Seed] Inserted ${SEED_ADMIN_STATES.length} states`);
    console.log('[Seed] Seeding districts...');
    await AdminDistrictModel.insertMany(SEED_ADMIN_DISTRICTS);
    console.log(`[Seed] Inserted ${SEED_ADMIN_DISTRICTS.length} districts`);
    console.log('[Seed] Seeding sub-districts...');
    await AdminSubDistrictModel.insertMany(SEED_ADMIN_SUB_DISTRICTS);
    console.log(`[Seed] Inserted ${SEED_ADMIN_SUB_DISTRICTS.length} sub-districts`);
    console.log('[Seed] Seeding blocks...');
    await AdminBlockModel.insertMany(SEED_ADMIN_BLOCKS);
    console.log(`[Seed] Inserted ${SEED_ADMIN_BLOCKS.length} blocks`);
    console.log('[Seed] Seeding localities...');
    await AdminLocalityModel.insertMany(SEED_ADMIN_LOCALITIES);
    console.log(`[Seed] Inserted ${SEED_ADMIN_LOCALITIES.length} localities`);
    console.log('[Seed] Seeding boundaries...');
    await AdministrativeBoundaryModel.insertMany(SEED_ADMIN_BOUNDARIES);
    console.log(`[Seed] Inserted ${SEED_ADMIN_BOUNDARIES.length} boundaries`);

    console.log('[Seed] Database seeding completed successfully!');
    console.log('[Seed] You can now start the server with: npm run dev');
  } catch (error) {
    console.error('[Seed] Error during seeding:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('[Seed] Disconnected from MongoDB');
  }
}

// Run if executed directly
seedDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });