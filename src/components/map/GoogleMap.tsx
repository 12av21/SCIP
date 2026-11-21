// SCIP - Google Maps Integration Component
// Provides Google Maps JavaScript API integration alongside Leaflet
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Report, Incident } from '../../types/scip';
import {
  Layers,
  Navigation,
  Search,
  MapPin,
  AlertTriangle,
  FileText,
  Globe,
  Maximize2,
  CheckCircle2
} from 'lucide-react';

interface GoogleMapProps {
  reports: Report[];
  incidents: Incident[];
  onSelectReport?: (report: Report) => void;
  onSelectIncident?: (incident: Incident) => void;
  selectedReportId?: string;
  selectedIncidentId?: string;
  apiKey?: string;
}

declare global {
  interface Window {
    google: any;
    initGoogleMap: () => void;
    __scip_google_maps_loaded: boolean;
  }
}

export const GoogleMap: React.FC<GoogleMapProps> = ({
  reports,
  incidents,
  onSelectReport,
  onSelectIncident,
  selectedReportId,
  selectedIncidentId,
  apiKey
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const circlesRef = useRef<Map<string, google.maps.Circle>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapType, setMapType] = useState<string>('roadmap');

  // Filter States
  const [showReports, setShowReports] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [showClusters, setShowClusters] = useState(true);
  const [showHotspots, setShowHotspots] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<{ type: 'report' | 'incident'; data: any } | null>(null);

  // Load Google Maps API
  useEffect(() => {
    if (window.__scip_google_maps_loaded && window.google?.maps) {
      setIsLoaded(true);
      return;
    }

    const existingScript = document.getElementById('google-maps-api');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        window.__scip_google_maps_loaded = true;
        setIsLoaded(true);
      });
      return;
    }

    const key = apiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    if (!key) {
      setLoadError('Google Maps API key not configured. Set VITE_GOOGLE_MAPS_API_KEY environment variable.');
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-api';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places,geometry,visualization&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.__scip_google_maps_loaded = true;
      setIsLoaded(true);
    };
    script.onerror = () => {
      setLoadError('Failed to load Google Maps API. Check your API key and network.');
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [apiKey]);

  // Initialize Map
  const initializeMap = useCallback(() => {
    if (!mapContainerRef.current || !window.google?.maps || mapInstanceRef.current) return;

    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: { lat: 28.625, lng: 77.218 },
      zoom: 13,
      mapTypeId: mapType,
      mapTypeControl: true,
      mapTypeControlOptions: {
        style: window.google.maps.MapTypeControlStyle.DROPDOWN_MENU,
        position: window.google.maps.ControlPosition.TOP_RIGHT
      },
      streetViewControl: true,
      streetViewControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_TOP
      },
      zoomControl: true,
      zoomControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_TOP
      },
      fullscreenControl: true,
      fullscreenControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_TOP
      },
      gestureHandling: 'cooperative'
    });

    mapInstanceRef.current = map;
    infoWindowRef.current = new window.google.maps.InfoWindow();

    // Fit bounds to data after initial load
    setTimeout(() => updateMapElements(), 100);
  }, [mapType]);

  // Category Colors
  const getCategoryColor = (cat: string): string => {
    switch (cat) {
      case 'Water & Drainage': return '#2563EB';
      case 'Roads & Infrastructure':
      case 'Roads & Traffic': return '#D97706';
      case 'Power & Lighting': return '#DC2626';
      case 'Sanitation & Waste':
      case 'Public Sanitation': return '#059669';
      case 'Public Safety': return '#7C3AED';
      default: return '#475569';
    }
  };

  const getPriorityColor = (priority: string): string => {
    if (priority === 'P1_CRITICAL' || priority === 'P1') return '#DC2626';
    if (priority === 'P2_HIGH' || priority === 'P2') return '#EA580C';
    return '#2563EB';
  };

  // Update Map Elements (Markers, Circles)
  const updateMapElements = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google?.maps) return;

    // Clear existing markers and circles
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current.clear();
    circlesRef.current.forEach(circle => circle.setMap(null));
    circlesRef.current.clear();

    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }

    const bounds = new window.google.maps.LatLngBounds();
    let hasValidCoords = false;

    // Filter Reports
    const filteredReports = reports.filter(r => {
      if (categoryFilter !== 'ALL' && r.category !== categoryFilter) return false;
      if (urgencyFilter !== 'ALL' && r.urgency !== urgencyFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchTitle = r.title.toLowerCase().includes(query);
        const matchLoc = r.locationName.toLowerCase().includes(query);
        if (!matchTitle && !matchLoc) return false;
      }
      return true;
    });

    // Filter Incidents
    const filteredIncidents = incidents.filter(i => {
      if (categoryFilter !== 'ALL' && i.category !== categoryFilter) return false;
      if (urgencyFilter !== 'ALL' && i.priority !== urgencyFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchTitle = i.title.toLowerCase().includes(query);
        const matchLoc = (i.locationName || '').toLowerCase().includes(query);
        if (!matchTitle && !matchLoc) return false;
      }
      return true;
    });

    // Render Incident Circles (Clusters/Hotspots)
    if (showClusters || showHotspots) {
      filteredIncidents.forEach(inc => {
        const lat = inc.latitude;
        const lng = inc.longitude;
        if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return;

        const position = new window.google.maps.LatLng(lat, lng);
        bounds.extend(position);
        hasValidCoords = true;

        const radiusMeters = inc.radiusMeters || Math.min(1200, Math.max(350, (inc.reportIds?.length || 3) * 120));
        const color = getPriorityColor(inc.priority);

        // Hotspot Glow Circle
        if (showHotspots) {
          const hotspotCircle = new window.google.maps.Circle({
            strokeColor: 'transparent',
            strokeOpacity: 0,
            strokeWeight: 0,
            fillColor: color,
            fillOpacity: 0.12,
            map,
            center: position,
            radius: radiusMeters * 1.3,
            clickable: false
          });
          circlesRef.current.set(`hotspot-${inc.id}`, hotspotCircle);
        }

        // Cluster Perimeter
        if (showClusters) {
          const clusterCircle = new window.google.maps.Circle({
            strokeColor: color,
            strokeOpacity: 0.7,
            strokeWeight: 1.5,
            fillColor: color,
            fillOpacity: 0.08,
            map,
            center: position,
            radius: radiusMeters,
            clickable: false
          });
          circlesRef.current.set(`cluster-${inc.id}`, clusterCircle);
        }
      });
    }

    // Render Incident Markers
    if (showIncidents) {
      filteredIncidents.forEach(inc => {
        const lat = inc.latitude;
        const lng = inc.longitude;
        if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return;

        const position = new window.google.maps.LatLng(lat, lng);
        bounds.extend(position);
        hasValidCoords = true;

        const isSelected = selectedIncidentId === inc.id;
        const color = getPriorityColor(inc.priority);
        const repCount = inc.reportIds?.length || 1;

        // Create custom marker using SVG
        const markerSvg = `
          <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="16" fill="${color}" stroke="white" stroke-width="2"/>
            <text x="20" y="26" text-anchor="middle" fill="white" font-size="14" font-weight="bold">⚡</text>
            <circle cx="34" cy="6" r="8" fill="#1e293b" stroke="white" stroke-width="1"/>
            <text x="34" y="10" text-anchor="middle" fill="white" font-size="9" font-weight="bold">${repCount}</text>
          </svg>
        `;

        const marker = new window.google.maps.Marker({
          position,
          map,
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(markerSvg)}`,
            scaledSize: new window.google.maps.Size(40, 40),
            anchor: new window.google.maps.Point(20, 20)
          },
          title: inc.title,
          zIndex: isSelected ? 1000 : 100
        });

        markersRef.current.set(`incident-${inc.id}`, marker);

        // Click handler
        marker.addListener('click', () => {
          setSelectedItem({ type: 'incident', data: inc });
          showInfoWindow(marker, inc, 'incident');
        });
      });
    }

    // Render Report Markers
    if (showReports) {
      filteredReports.forEach(rep => {
        const lat = rep.latitude;
        const lng = rep.longitude;
        if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return;

        const position = new window.google.maps.LatLng(lat, lng);
        bounds.extend(position);
        hasValidCoords = true;

        const isSelected = selectedReportId === rep.id;
        const color = getCategoryColor(rep.category);

        const markerSvg = `
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="12" fill="${color}" stroke="white" stroke-width="2"/>
            <circle cx="16" cy="16" r="4" fill="white"/>
          </svg>
        `;

        const marker = new window.google.maps.Marker({
          position,
          map,
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(markerSvg)}`,
            scaledSize: new window.google.maps.Size(32, 32),
            anchor: new window.google.maps.Point(16, 16)
          },
          title: rep.title,
          zIndex: isSelected ? 1000 : 50
        });

        markersRef.current.set(`report-${rep.id}`, marker);

        marker.addListener('click', () => {
          setSelectedItem({ type: 'report', data: rep });
          showInfoWindow(marker, rep, 'report');
        });
      });
    }

    // Fit bounds
    if (hasValidCoords) {
      map.fitBounds(bounds, 40);
    }
  }, [
    reports,
    incidents,
    showReports,
    showIncidents,
    showClusters,
    showHotspots,
    categoryFilter,
    urgencyFilter,
    searchQuery,
    selectedReportId,
    selectedIncidentId
  ]);

  // Show Info Window
  const showInfoWindow = (marker: google.maps.Marker, data: any, type: 'report' | 'incident') => {
    const infoWindow = infoWindowRef.current;
    if (!infoWindow || !window.google?.maps) return;

    const isIncident = type === 'incident';
    const color = isIncident ? getPriorityColor(data.priority) : getCategoryColor(data.category);
    const priorityLabel = isIncident ? data.priority.replace('_', ' ') : data.urgency;
    const idLabel = isIncident ? 'Incident' : 'Report';
    const actionLabel = isIncident ? 'Investigate Incident' : 'Inspect Report';

    const content = `
      <div class="p-2 min-w-[240px] font-sans text-slate-800" style="font-family: system-ui, sans-serif;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:10px;font-family:monospace;padding:2px 6px;background:#f1f5f9;color:#475569;border-radius:4px;font-weight:600;">${data.id}</span>
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;padding:2px 8px;border-radius:4px;background:${isIncident ? (data.priority === 'P1_CRITICAL' ? '#fef2f2' : '#fff7ed') : '#f0fdf4'};color:${isIncident ? (data.priority === 'P1_CRITICAL' ? '#b91c1c' : '#b45309') : '#166534'}">${priorityLabel}</span>
        </div>
        <div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:6px;line-height:1.3;">${data.title}</div>
        <div style="font-size:11px;color:#64748b;margin-bottom:4px;">📍 ${data.locationName}</div>
        <div style="font-size:11px;color:#475569;margin-bottom:10px;">Category: <strong>${data.category}</strong> ${isIncident ? `· Reports: <strong>${data.reportIds?.length || 1}</strong>` : `· Urgency: <strong>${data.urgency}</strong>`}</div>
        <button id="scip-gmaps-action-${data.id}" style="width:100%;padding:8px 12px;font-size:11px;font-weight:600;color:white;background:#1e293b;border:none;border-radius:6px;cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='#1e293b'">${actionLabel}</button>
      </div>
    `;

    infoWindow.setContent(content);
    infoWindow.open(mapInstanceRef.current!, marker);

    // Attach click handler to button after DOM is ready
    setTimeout(() => {
      const btn = document.getElementById(`scip-gmaps-action-${data.id}`);
      if (btn) {
        btn.onclick = () => {
          if (isIncident && onSelectIncident) onSelectIncident(data);
          else if (!isIncident && onSelectReport) onSelectReport(data);
          infoWindow.close();
        };
      }
    }, 50);
  };

  // Reset View
  const handleResetView = useCallback(() => {
    const map = mapInstanceRef.current;
    if (map && window.google?.maps) {
      map.setCenter({ lat: 28.625, lng: 77.218 });
      map.setZoom(13);
    }
  }, []);

  // Initialize map when loaded
  useEffect(() => {
    if (isLoaded && !loadError) {
      initializeMap();
    }
  }, [isLoaded, loadError, initializeMap]);

  // Update elements when data/filters change
  useEffect(() => {
    if (mapInstanceRef.current && isLoaded) {
      updateMapElements();
    }
  }, [updateMapElements, isLoaded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach(marker => marker.setMap(null));
      circlesRef.current.forEach(circle => circle.setMap(null));
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Render
  if (loadError) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 h-[600px] flex items-center justify-center p-8">
        <div className="text-center text-slate-600">
          <Globe className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="font-medium text-slate-900 mb-2">Google Maps Unavailable</p>
          <p className="text-sm">{loadError}</p>
          <p className="text-xs text-slate-500 mt-2">Set VITE_GOOGLE_MAPS_API_KEY in .env to enable</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 h-[600px] flex items-center justify-center">
        <div className="text-center text-slate-500">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-[#1F5F91] border-t-transparent mx-auto mb-3" />
          <p>Loading Google Maps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col h-[600px] shadow-xs">
      {/* Top Map Control Bar */}
      <div className="p-3 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 flex items-center gap-1.5">
            <Navigation className="w-4 h-4 text-emerald-600" />
            Metro Municipal District GIS (Google Maps Engine)
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500 font-mono text-[11px]">
            {reports.length} observations · {incidents.length} active incidents
          </span>
        </div>

        {/* Search & Quick Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search address or title..."
              className="pl-8 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 w-44 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-hidden"
          >
            <option value="ALL">All Categories</option>
            <option value="Water & Drainage">Water & Drainage</option>
            <option value="Roads & Traffic">Roads & Traffic</option>
            <option value="Power & Lighting">Power & Lighting</option>
            <option value="Sanitation & Waste">Sanitation & Waste</option>
            <option value="Public Safety">Public Safety</option>
          </select>

          {/* Urgency Dropdown */}
          <select
            value={urgencyFilter}
            onChange={e => setUrgencyFilter(e.target.value)}
            className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-hidden"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Map Type Selector */}
          <select
            value={mapType}
            onChange={e => {
              const val = e.target.value as google.maps.MapTypeId;
              setMapType(val);
              if (mapInstanceRef.current) {
                mapInstanceRef.current.setMapTypeId(val);
              }
            }}
            className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-hidden"
          >
            <option value="roadmap">Roadmap</option>
            <option value="satellite">Satellite</option>
            <option value="hybrid">Hybrid</option>
            <option value="terrain">Terrain</option>
          </select>

          {/* Reset View Button */}
          <button
            onClick={handleResetView}
            className="p-1.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
            title="Reset to Municipal Center"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Map Viewport & Overlay */}
      <div className="relative flex-1">
        {/* Google Map Div Container */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating Layer Controls Badge */}
        <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-xs p-2.5 rounded-xl border border-slate-200/90 shadow-md text-xs space-y-2">
          <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Map Layers</span>
          </div>

          <div className="space-y-1.5 text-slate-700">
            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px]">
              <input
                type="checkbox"
                checked={showReports}
                onChange={e => setShowReports(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-0 w-3.5 h-3.5"
              />
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                Reports ({reports.length})
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px]">
              <input
                type="checkbox"
                checked={showIncidents}
                onChange={e => setShowIncidents(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0 w-3.5 h-3.5"
              />
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-md bg-amber-600 inline-block" />
                Incidents ({incidents.length})
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px]">
              <input
                type="checkbox"
                checked={showClusters}
                onChange={e => setShowClusters(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-0 w-3.5 h-3.5"
              />
              <span>DBSCAN Clusters</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px]">
              <input
                type="checkbox"
                checked={showHotspots}
                onChange={e => setShowHotspots(e.target.checked)}
                className="rounded text-rose-600 focus:ring-0 w-3.5 h-3.5"
              />
              <span>Density Hotspots</span>
            </label>
          </div>
        </div>

        {/* Floating Legend Badge */}
        <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-xs px-3 py-2 rounded-xl border border-slate-200 shadow-md text-[11px] text-slate-600 flex items-center gap-4 hidden sm:flex">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <span>Water / Drainage</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
            <span>Roads / Traffic</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
            <span>Power / High Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span>Sanitation</span>
          </div>
        </div>

        {/* Selected Item Floating Inspection Card */}
        {selectedItem && (
          <div className="absolute top-3 right-14 z-10 bg-white rounded-xl border border-slate-200 shadow-xl p-3.5 max-w-xs text-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[10px] text-slate-500 font-bold">{selectedItem.data.id}</span>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <h4 className="font-bold text-slate-900 leading-snug mb-1">{selectedItem.data.title}</h4>
            <div className="text-slate-500 text-[11px] mb-2">📍 {selectedItem.data.locationName || 'Municipal District'}</div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-700">
                {selectedItem.type === 'report' ? `Urgency: ${selectedItem.data.urgency}` : `Priority: ${selectedItem.data.priority}`}
              </span>
              <button
                onClick={() => {
                  if (selectedItem.type === 'report' && onSelectReport) {
                    onSelectReport(selectedItem.data);
                  } else if (selectedItem.type === 'incident' && onSelectIncident) {
                    onSelectIncident(selectedItem.data);
                  }
                }}
                className="px-2 py-1 text-[11px] font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
              >
                Open Details
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleMap;