// SCIP - Unified Map Component with Leaflet & Google Maps Support
import React, { useState, useEffect, useRef } from 'react';
import { GeospatialMap } from './GeospatialMap';
import { GoogleMap } from './GoogleMap';
import { Report, Incident } from '../../types/scip';
import { MapPin, Layers, Globe, Maximize2 } from 'lucide-react';

type MapEngine = 'leaflet' | 'google';

interface UnifiedMapProps {
  reports: Report[];
  incidents: Incident[];
  onSelectReport?: (report: Report) => void;
  onSelectIncident?: (incident: Incident) => void;
  selectedReportId?: string;
  selectedIncidentId?: string;
  defaultEngine?: MapEngine;
  googleMapsApiKey?: string;
}

export const UnifiedMap: React.FC<UnifiedMapProps> = ({
  reports,
  incidents,
  onSelectReport,
  onSelectIncident,
  selectedReportId,
  selectedIncidentId,
  defaultEngine = 'leaflet',
  googleMapsApiKey
}) => {
  const [engine, setEngine] = useState<MapEngine>(defaultEngine);
  const [isGoogleMapsAvailable, setIsGoogleMapsAvailable] = useState(false);
  const googleMapsCheckedRef = useRef(false);

  // Check if Google Maps API key is available
  useEffect(() => {
    if (googleMapsCheckedRef.current) return;
    googleMapsCheckedRef.current = true;

    const key = googleMapsApiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    setIsGoogleMapsAvailable(!!key);
  }, [googleMapsApiKey]);

  const handleEngineChange = (newEngine: MapEngine) => {
    setEngine(newEngine);
    // Store preference
    localStorage.setItem('scip_preferred_map_engine', newEngine);
  };

  // Load saved preference
  useEffect(() => {
    const saved = localStorage.getItem('scip_preferred_map_engine') as MapEngine | null;
    if (saved && (saved === 'leaflet' || saved === 'google')) {
      if (saved === 'google' && !isGoogleMapsAvailable) {
        // Fallback to leaflet if Google Maps not available
        setEngine('leaflet');
      } else {
        setEngine(saved);
      }
    }
  }, [isGoogleMapsAvailable]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col h-[600px] shadow-xs">
      {/* Engine Selector Bar */}
      <div className="p-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Map Engine:</span>
          <div className="flex bg-slate-100 rounded-lg p-0.5" role="radiogroup" aria-label="Map engine selection">
            <button
              role="radio"
              aria-checked={engine === 'leaflet'}
              onClick={() => handleEngineChange('leaflet')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                engine === 'leaflet'
                  ? 'bg-white text-[#153E63] shadow-xs'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 inline-block mr-1" />
              Leaflet
            </button>
            {isGoogleMapsAvailable && (
              <button
                role="radio"
                aria-checked={engine === 'google'}
                onClick={() => handleEngineChange('google')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  engine === 'google'
                    ? 'bg-white text-[#153E63] shadow-xs'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <Globe className="w-3.5 h-3.5 inline-block mr-1" />
                Google Maps
              </button>
            )}
          </div>
        </div>

        {!isGoogleMapsAvailable && (
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Layers className="w-3 h-3" />
            Set VITE_GOOGLE_MAPS_API_KEY to enable Google Maps
          </span>
        )}
      </div>

      {/* Map Renderer */}
      <div className="flex-1 relative">
        {engine === 'leaflet' && (
          <GeospatialMap
            reports={reports}
            incidents={incidents}
            onSelectReport={onSelectReport}
            onSelectIncident={onSelectIncident}
            selectedReportId={selectedReportId}
            selectedIncidentId={selectedIncidentId}
          />
        )}
        {engine === 'google' && isGoogleMapsAvailable && (
          <GoogleMap
            reports={reports}
            incidents={incidents}
            onSelectReport={onSelectReport}
            onSelectIncident={onSelectIncident}
            selectedReportId={selectedReportId}
            selectedIncidentId={selectedIncidentId}
            apiKey={googleMapsApiKey}
          />
        )}
        {engine === 'google' && !isGoogleMapsAvailable && (
          <div className="w-full h-full flex items-center justify-center bg-slate-50">
            <div className="text-center text-slate-600 p-8">
              <Globe className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="font-medium text-slate-900 mb-2">Google Maps Unavailable</p>
              <p className="text-sm mb-4">API key not configured.</p>
              <button
                onClick={() => setEngine('leaflet')}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#1F5F91] hover:bg-[#153E63] rounded-lg transition-colors"
              >
                Switch to Leaflet
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedMap;