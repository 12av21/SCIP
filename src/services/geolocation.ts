// SCIP - Geolocation Service (IP-based + Browser GPS)
// Provides location detection for automatic complaint geotagging
import { ComplaintLocation, AdminState, AdminDistrict, AdminSubDistrict, AdminBlock, AdminLocality } from '../types/scip';
import { api } from './apiClient';

// Browser Geolocation Options
export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

// Location Result with metadata
export interface LocationResult {
  location: ComplaintLocation;
  source: 'gps' | 'ip' | 'manual_map' | 'geocoded' | 'preset';
  accuracy?: number;
  timestamp: string;
  fallbackUsed?: boolean;
  fallbackReason?: string;
}

// IP Geolocation Response (from ipapi.co or similar)
interface IPGeolocationResponse {
  ip: string;
  city: string;
  region: string;
  region_code: string;
  country: string;
  country_code: string;
  continent_code: string;
  latitude: number;
  longitude: number;
  timezone: string;
  utc_offset: string;
  country_calling_code: string;
  currency: string;
  languages: string;
  asn: string;
  org: string;
  postal: string;
  error?: boolean;
  reason?: string;
}

// Cache for IP location (5 min TTL)
let ipLocationCache: { data: LocationResult; expires: number } | null = null;
const IP_CACHE_TTL_MS = 5 * 60 * 1000;

// Browser GPS detection with timeout wrapper
export async function getBrowserLocation(options: GeolocationOptions = {}): Promise<LocationResult> {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0
  } = options;

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation API not supported in this browser'));
      return;
    }

    const timer = setTimeout(() => {
      reject(new Error('Geolocation request timed out'));
    }, timeout);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timer);
        const { latitude, longitude, accuracy } = position.coords;
        
        // Reverse geocode to get administrative boundaries
        resolve({
          location: {
            latitude,
            longitude,
            locationSource: 'gps',
            locationAccuracyMeters: Math.round(accuracy),
            locationConfirmedAt: new Date().toISOString()
          },
          source: 'gps',
          accuracy: Math.round(accuracy),
          timestamp: new Date().toISOString()
        });
      },
      (error) => {
        clearTimeout(timer);
        let message = 'Failed to get browser location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out';
            break;
        }
        reject(new Error(message));
      },
      { enableHighAccuracy, timeout, maximumAge }
    );
  });
}

// IP-based geolocation using ipapi.co (free tier: 1000 req/day)
export async function getIPLocation(): Promise<LocationResult> {
  // Check cache first
  if (ipLocationCache && Date.now() < ipLocationCache.expires) {
    return { ...ipLocationCache.data, fallbackUsed: true, fallbackReason: 'Cached IP location' };
  }

  try {
    // Using ipapi.co - free, no API key needed for basic usage
    const response = await fetch('https://ipapi.co/json/', {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`IP geolocation failed: ${response.status}`);
    }

    const data: IPGeolocationResponse = await response.json();

    if (data.error) {
      throw new Error(data.reason || 'IP geolocation service error');
    }

    const result: LocationResult = {
      location: {
        latitude: data.latitude,
        longitude: data.longitude,
        locationSource: 'ip',
        locationAccuracyMeters: 5000, // IP-based accuracy ~5km
        locationConfirmedAt: new Date().toISOString(),
        address: `${data.city}, ${data.region} ${data.postal}`,
        pinCode: data.postal || undefined
      },
      source: 'ip',
      accuracy: 5000,
      timestamp: new Date().toISOString()
    };

    // Cache the result
    ipLocationCache = { data: result, expires: Date.now() + IP_CACHE_TTL_MS };

    return result;
  } catch (error) {
    // Fallback to default municipal center
    return getDefaultLocation();
  }
}

// Default fallback location (Metro Municipal District center)
export function getDefaultLocation(): LocationResult {
  return {
    location: {
      latitude: 28.625,
      longitude: 77.218,
      locationSource: 'preset',
      locationAccuracyMeters: 10000,
      locationConfirmedAt: new Date().toISOString(),
      address: 'Metro Municipal District Center',
      stateId: 'IN-ST-01',
      districtId: 'IN-DL-01'
    },
    source: 'preset',
    accuracy: 10000,
    timestamp: new Date().toISOString(),
    fallbackUsed: true,
    fallbackReason: 'Using default municipal center'
  };
}

// Smart location detection: tries GPS first, falls back to IP, then default
export async function detectLocation(options: GeolocationOptions = {}): Promise<LocationResult> {
  // Try browser GPS first (most accurate)
  try {
    const gpsResult = await getBrowserLocation(options);
    // Enrich with administrative boundaries
    const enriched = await enrichWithAdminBoundaries(gpsResult.location);
    return { ...gpsResult, location: enriched };
  } catch (gpsError) {
    console.warn('GPS location failed, falling back to IP:', gpsError);
  }

  // Try IP-based geolocation
  try {
    const ipResult = await getIPLocation();
    const enriched = await enrichWithAdminBoundaries(ipResult.location);
    return { ...ipResult, location: enriched };
  } catch (ipError) {
    console.warn('IP location failed, using default:', ipError);
  }

  // Final fallback
  return getDefaultLocation();
}

// Enrich location with Indian administrative boundaries
export async function enrichWithAdminBoundaries(location: ComplaintLocation): Promise<ComplaintLocation> {
  try {
    const jurisdiction = await api.getMapJurisdiction(location.latitude, location.longitude);
    if (jurisdiction && jurisdiction.withinKnownBoundary) {
      return {
        ...location,
        stateId: jurisdiction.stateId,
        districtId: jurisdiction.districtId,
        subDistrictId: jurisdiction.subDistrictId,
        blockId: jurisdiction.blockId,
        localityId: jurisdiction.localityId,
        pinCode: jurisdiction.pinCode || location.pinCode
      };
    }
  } catch (error) {
    console.warn('Failed to enrich with admin boundaries:', error);
  }
  return location;
}

// Get administrative jurisdiction for coordinates
export async function getJurisdiction(lat: number, lng: number) {
  return api.getMapJurisdiction(lat, lng);
}

// Get recommended officers for location
export async function getRecommendedOfficers(lat: number, lng: number, departmentId?: string) {
  return api.getRecommendedOfficers(lat, lng, departmentId);
}

// Format location for display
export function formatLocation(location: ComplaintLocation): string {
  const parts = [];
  if (location.localityId) parts.push(`Locality: ${location.localityId}`);
  if (location.blockId) parts.push(`Block: ${location.blockId}`);
  if (location.subDistrictId) parts.push(`Sub-District: ${location.subDistrictId}`);
  if (location.districtId) parts.push(`District: ${location.districtId}`);
  if (location.stateId) parts.push(`State: ${location.stateId}`);
  if (location.pinCode) parts.push(`PIN: ${location.pinCode}`);
  return parts.join(', ') || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
}

// Calculate distance between two points (Haversine formula)
export function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Check if location is within radius of another point
export function isWithinRadius(
  centerLat: number, centerLng: number,
  pointLat: number, pointLng: number,
  radiusMeters: number
): boolean {
  return calculateDistance(centerLat, centerLng, pointLat, pointLng) <= radiusMeters;
}

// Geocode address to coordinates (using backend proxy to avoid CORS)
export async function geocodeAddress(address: string): Promise<ComplaintLocation | null> {
  try {
    // This would typically call a backend endpoint that proxies to a geocoding service
    // For now, return null to indicate geocoding not implemented
    return null;
  } catch {
    return null;
  }
}

// Reverse geocode coordinates to address
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const jurisdiction = await getJurisdiction(lat, lng);
    if (jurisdiction && jurisdiction.withinKnownBoundary) {
      return formatLocation({
        latitude: lat,
        longitude: lng,
        localityId: jurisdiction.localityId,
        blockId: jurisdiction.blockId,
        subDistrictId: jurisdiction.subDistrictId,
        districtId: jurisdiction.districtId,
        stateId: jurisdiction.stateId,
        pinCode: jurisdiction.pinCode,
        locationSource: 'geocoded'
      });
    }
  } catch {
    // Ignore
  }
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

export const geolocationService = {
  getBrowserLocation,
  getIPLocation,
  detectLocation,
  getDefaultLocation,
  enrichWithAdminBoundaries,
  getJurisdiction,
  getRecommendedOfficers,
  formatLocation,
  calculateDistance,
  isWithinRadius,
  geocodeAddress,
  reverseGeocode
};

export default geolocationService;