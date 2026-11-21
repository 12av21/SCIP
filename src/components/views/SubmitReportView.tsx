// SCIP Citizen Portal - Submit Report with Interactive Map & GPS Location
// Indian Government Portal Aesthetic with verifiable records and official citizen cards
import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../../services/apiClient';
import { Report, ReportCategory, UrgencyLevel, AIAnalysis, AdminState, AdminDistrict, AdminSubDistrict, AdminBlock, AdminLocality } from '../../types/scip';
import { classifyReport, extractEntities, determineSeverity } from '../../ai/classifier';
import {
  FileText,
  MapPin,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Layers,
  Camera,
  Trash2,
  Building2,
  Info,
  LocateIcon as MyLocation,
  Crosshair,
  Globe,
  Home
} from 'lucide-react';

interface SubmitReportViewProps {
  onReportCreated?: (report: Report, analysis: AIAnalysis) => void;
  onNavigateToMyReports?: () => void;
}

const PRESET_LOCATIONS: { name: string; lat: number; lng: number }[] = [];

const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629];

export const SubmitReportView: React.FC<SubmitReportViewProps> = ({
  onReportCreated,
  onNavigateToMyReports
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ReportCategory>('Water & Drainage');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState(DEFAULT_CENTER[0]);
  const [longitude, setLongitude] = useState(DEFAULT_CENTER[1]);
  const [urgency, setUrgency] = useState<UrgencyLevel>('medium');
  const [images, setImages] = useState<string[]>([]);

  // Administrative hierarchy (India)
  const [states, setStates] = useState<AdminState[]>([]);
  const [districts, setDistricts] = useState<AdminDistrict[]>([]);
  const [subDistricts, setSubDistricts] = useState<AdminSubDistrict[]>([]);
  const [blocks, setBlocks] = useState<AdminBlock[]>([]);
  const [localities, setLocalities] = useState<AdminLocality[]>([]);
  const [selectedStateId, setSelectedStateId] = useState<string>('');
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('');
  const [selectedSubDistrictId, setSelectedSubDistrictId] = useState<string>('');
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');
  const [selectedLocalityId, setSelectedLocalityId] = useState<string>('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [locationSource, setLocationSource] = useState<'gps' | 'manual_map' | 'geocoded' | 'preset'>('manual_map');

  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<{ report: Report; analysis: AIAnalysis } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [mapReady, setMapReady] = useState(false);
const [gpsLoading, setGpsLoading] = useState(false);

const mapRef = useRef<L.Map | null>(null);
const markerRef = useRef<L.Marker | null>(null);
const circleRef = useRef<L.Circle | null>(null);
const containerRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!containerRef.current) return;
  if (!mapRef.current) {
    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 5,
      zoomControl: false,
      attributionControl: false
    });
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);
    L.control.attribution({ position: 'bottomright', prefix: 'SCIP GIS · Leaflet' }).addTo(map);

    const marker = L.marker(DEFAULT_CENTER, {
      draggable: true
    }).addTo(map);
    const accuracyCircle = L.circle(DEFAULT_CENTER, {
      radius: 10,
      color: '#1F5F91',
      fillColor: '#1F5F91',
      fillOpacity: 0.15,
      weight: 1
    }).addTo(map);

    mapRef.current = map;
    markerRef.current = marker;
    circleRef.current = accuracyCircle;

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      setLatitude(pos.lat);
      setLongitude(pos.lng);
      setLocationSource('manual_map');
      setLocationName(`Map-selected location (${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)})`);
      accuracyCircle.setLatLng(pos);
    });

    map.on('click', handleMapClick);
    setMapReady(true);
  }
  return () => {
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
      setMapReady(false);
    }
  };
}, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (images.length + files.length > 4) {
      setErrorMessage('Maximum 4 photographs allowed per report.');
      return;
    }

    Array.from(files).forEach(file => {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
        setErrorMessage('Only JPG, PNG, and WebP images are supported.');
        return;
      }
      if (file.size > 2.5 * 1024 * 1024) {
        setErrorMessage('Image size must be under 2.5 MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const text = `${title} ${description}`;
    if (text.trim().length > 10) {
      const cls = classifyReport(text);
      const ent = extractEntities(text);
      const sev = determineSeverity(text, urgency);
      setAiSuggestion({
        predictedCategory: cls.predictedCategory,
        confidence: cls.confidence,
        entities: ent,
        severity: sev
      });
    } else {
      setAiSuggestion(null);
    }
  }, [title, description, urgency]);

  const handleApplyAiCategory = () => {
    if (aiSuggestion?.predictedCategory) {
      setCategory(aiSuggestion.predictedCategory);
    }
  };

  const handleLocationPreset = (preset: typeof PRESET_LOCATIONS[0]) => {
    setLocationName(preset.name);
    setLatitude(preset.lat);
    setLongitude(preset.lng);
    setLocationSource('preset');
      if (mapRef.current && markerRef.current) {
        mapRef.current.flyTo([preset.lat, preset.lng] as [number, number], 15);
      markerRef.current.setLatLng([preset.lat, preset.lng]);
      circleRef.current?.setLatLng([preset.lat, preset.lng]);
    }
  };

  const loadStates = async () => {
    try {
      const data = await api.getStates();
      setStates(data);
    } catch {
      // Silent fallback; hierarchical fields remain optional
    }
  };

  useEffect(() => {
    loadStates();
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!selectedStateId) { setDistricts([]); setSubDistricts([]); setBlocks([]); setLocalities([]); return; }
      try { setDistricts(await api.getDistricts(selectedStateId)); } catch { setDistricts([]); }
    };
    load();
  }, [selectedStateId]);

  useEffect(() => {
    const load = async () => {
      if (!selectedDistrictId) { setSubDistricts([]); setBlocks([]); setLocalities([]); return; }
      try { setSubDistricts(await api.getSubDistricts(selectedDistrictId)); } catch { setSubDistricts([]); }
    };
    load();
  }, [selectedDistrictId]);

  useEffect(() => {
    const load = async () => {
      if (!selectedSubDistrictId) { setBlocks([]); setLocalities([]); return; }
      try { setBlocks(await api.getBlocks(selectedSubDistrictId)); } catch { setBlocks([]); }
    };
    load();
  }, [selectedSubDistrictId]);

  useEffect(() => {
    const load = async () => {
      if (!selectedBlockId) { setLocalities([]); return; }
      try { setLocalities(await api.getLocalities(selectedBlockId)); } catch { setLocalities([]); }
    };
    load();
  }, [selectedBlockId]);

  const handleUseGPS = async () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    setErrorMessage('');
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
      });
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      setLatitude(lat);
      setLongitude(lng);
      setLocationSource('gps');
      setLocationName(`GPS location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      if (mapRef.current) {
        mapRef.current.flyTo([lat, lng] as [number, number], 16);
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        }
        if (circleRef.current) {
          circleRef.current.setLatLng([lat, lng]).setRadius(accuracy || 10);
        }
      }
    } catch {
      setErrorMessage('Unable to access your location. Please use the map or enter coordinates manually.');
    } finally {
      setGpsLoading(false);
    }
  };

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    const { lat, lng } = e.latlng;
    setLatitude(lat);
    setLongitude(lng);
    setLocationSource('manual_map');
    setLocationName(`Map-selected location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
    if (circleRef.current) {
      circleRef.current.setLatLng([lat, lng]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (title.trim().length < 5) {
      setErrorMessage('Please provide a descriptive title (at least 5 characters).');
      return;
    }
    if (description.trim().length < 10) {
      setErrorMessage('Please provide more detail in the description (at least 10 characters).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createReport({
        title,
        description,
        category,
        locationName,
        latitude,
        longitude,
        urgency,
        images,
        stateId: selectedStateId || undefined,
        districtId: selectedDistrictId || undefined,
        subDistrictId: selectedSubDistrictId || undefined,
        blockId: selectedBlockId || undefined,
        localityId: selectedLocalityId || undefined,
        address: address.trim() || undefined,
        landmark: landmark.trim() || undefined,
        pinCode: pinCode.trim() || undefined,
        locationSource,
        locationAccuracyMeters: undefined,
        locationConfirmedAt: new Date().toISOString()
      });

      setSubmittedResult(res);
      onReportCreated?.(res.report, res.analysis);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit report to municipal server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setTitle('');
    setDescription('');
    setCategory('Water & Drainage');
    setLocationName('');
    setLatitude(DEFAULT_CENTER[0]);
    setLongitude(DEFAULT_CENTER[1]);
    setUrgency('medium');
    setImages([]);
    setSelectedStateId('');
    setSelectedDistrictId('');
    setSelectedSubDistrictId('');
    setSelectedBlockId('');
    setSelectedLocalityId('');
    setAddress('');
    setLandmark('');
    setPinCode('');
    setLocationSource('manual_map');
    setSubmittedResult(null);
    setErrorMessage('');
    if (mapRef.current && markerRef.current) {
      mapRef.current.flyTo(DEFAULT_CENTER, 5);
      markerRef.current.setLatLng(DEFAULT_CENTER);
    }
  };

  const adminField = (label: string, value: string, options: { id: string; name: string }[], onChange: (id: string) => void, disabled: boolean) => (
    <div key={label}>
      <label className="block text-[11px] font-bold text-[#153E63] mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3.5 py-2.5 text-xs text-[#253443] bg-[#F5F7FA] focus:bg-white border border-[#DCE3EA] focus:border-[#1F5F91] rounded-lg focus:outline-hidden transition-colors"
      >
        <option value="">Select {label}</option>
        {options.map(o => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
    </div>
  );

  if (submittedResult) {
    const { report, analysis } = submittedResult;
    return (
      <div className="max-w-3xl mx-auto py-6 space-y-6 text-[#253443]">
        <div className="bg-[#EBF7EE] border border-[#A7E0B8] rounded-xl p-6 text-[#1A532C] space-y-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-[#28834A]" />
            <div>
              <h2 className="text-base font-bold text-[#1A532C]">
                Official Grievance Registered Successfully
              </h2>
              <div className="text-xs text-[#28834A] font-mono mt-0.5">
                Reference ID: <span className="font-bold">{report.id}</span> · Status: {report.status}
              </div>
            </div>
          </div>
          <p className="text-xs text-[#1A532C] leading-relaxed">
            Your observation has been permanently recorded in the municipal database and routed through automated TF-IDF classification and clustering analysis.
          </p>
        </div>

        <div className="bg-white border border-[#DCE3EA] rounded-xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#DCE3EA] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#E89B36]" />
              <h3 className="font-bold text-[#153E63] text-sm">Automated AI Pipeline Findings</h3>
            </div>
            <span className="text-xs font-mono text-[#1F5F91] font-semibold tabular-nums">
              Confidence: {(analysis.categoryConfidence * 100).toFixed(0)}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-[#F5F7FA] rounded-lg border border-[#DCE3EA]">
              <span className="text-[#657586] text-[11px]">Predicted Category:</span>
              <div className="font-bold text-[#153E63] mt-0.5">{analysis.categoryPredicted}</div>
            </div>
            <div className="p-3 bg-[#F5F7FA] rounded-lg border border-[#DCE3EA]">
              <span className="text-[#657586] text-[11px]">Calculated Risk Score:</span>
              <div className="font-bold text-[#1F5F91] font-mono mt-0.5 tabular-nums">
                {analysis.riskScore}/100 ({analysis.severityIndicator.toUpperCase()})
              </div>
            </div>
            <div className="p-3 bg-[#F5F7FA] rounded-lg border border-[#DCE3EA]">
              <span className="text-[#657586] text-[11px]">Extracted Keywords:</span>
              <div className="font-medium text-[#253443] mt-0.5">
                {analysis.keywords.slice(0, 4).join(', ') || 'N/A'}
              </div>
            </div>
            <div className="p-3 bg-[#F5F7FA] rounded-lg border border-[#DCE3EA]">
              <span className="text-[#657586] text-[11px]">Cluster / Incident Linkage:</span>
              <div className="font-medium text-[#253443] mt-0.5">
                {analysis.possibleIncident
                  ? 'Linked to potential incident cluster'
                  : 'Logged as standalone observation'}
              </div>
            </div>
          </div>

          {analysis.topSimilarReports.length > 0 && (
            <div className="border-t border-[#DCE3EA] pt-3 text-xs space-y-2">
              <span className="text-[#657586] font-semibold">Similar Observations in Proximity:</span>
              <ul className="space-y-1.5">
                {analysis.topSimilarReports.slice(0, 2).map(sim => (
                  <li key={sim.reportId} className="p-2.5 rounded-lg bg-[#F5F7FA] border border-[#DCE3EA] flex items-center justify-between">
                    <div>
                      <span className="font-mono text-[#1F5F91] font-bold mr-2">{sim.reportId}</span>
                      <span className="text-[#253443]">{sim.reportTitle}</span>
                    </div>
                    <span className="text-[#657586] font-mono text-[11px] tabular-nums">
                      {sim.distanceMeters}m away
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToMyReports}
            className="px-5 py-2.5 text-xs font-bold text-white bg-[#1F5F91] hover:bg-[#153E63] rounded-lg transition-colors shadow-xs"
          >
            View in My Reports
          </button>
          <button
            onClick={handleReset}
            className="px-5 py-2.5 text-xs font-bold text-[#153E63] bg-[#EAF2F8] hover:bg-[#dbeafe] border border-[#DCE3EA] rounded-lg transition-colors"
          >
            Submit Another Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-2 space-y-6 text-[#253443]">
      <div className="border-b border-[#DCE3EA] pb-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#1F5F91]">
          <span className="w-2 h-2 rounded-full bg-[#E89B36]" />
          <span>Public Service Grievance Intake</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#153E63] mt-1">
          Submit Community Observation
        </h1>
        <p className="text-xs text-[#657586] font-medium mt-0.5">
          Report municipal issues like water logging, drainage obstruction, broken roads, or electrical hazards.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#B42318] shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-[#DCE3EA] rounded-xl p-6 sm:p-8 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Form Fields */}
          <div className="space-y-5 lg:col-span-2">
            {/* Title Field */}
            <div>
              <label className="block text-xs font-bold text-[#153E63] mb-1">
                Grievance / Observation Title <span className="text-[#B42318]">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Severe water accumulation and blocked storm drain"
                className="w-full px-3.5 py-2.5 text-xs text-[#253443] bg-[#F5F7FA] focus:bg-white border border-[#DCE3EA] focus:border-[#1F5F91] rounded-lg focus:outline-hidden transition-colors"
              />
            </div>

            {/* Description Field */}
            <div>
              <label className="block text-xs font-bold text-[#153E63] mb-1">
                Detailed Ground Observation Notes <span className="text-[#B42318]">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe what you observed: severity of water/damage, landmarks, blocked culverts, traffic impact..."
                className="w-full px-3.5 py-2.5 text-xs text-[#253443] bg-[#F5F7FA] focus:bg-white border border-[#DCE3EA] focus:border-[#1F5F91] rounded-lg focus:outline-hidden leading-relaxed transition-colors"
              />
            </div>

            {/* Live AI Assistant Suggestion Callout */}
            {aiSuggestion && (
              <div className="p-4 bg-[#EAF2F8] border border-[#DCE3EA] rounded-lg text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-[#153E63]">
                    <Sparkles className="w-4 h-4 text-[#E89B36]" />
                    <span>AI Categorization Suggestion</span>
                  </div>
                  <span className="font-mono text-[11px] text-[#1F5F91] font-bold tabular-nums">
                    {(aiSuggestion.confidence * 100).toFixed(0)}% Match
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[#253443]">
                  <span>
                    Based on your description, this best matches category: <strong className="text-[#153E63]">{aiSuggestion.predictedCategory}</strong>
                  </span>
                  {category !== aiSuggestion.predictedCategory && (
                    <button
                      type="button"
                      onClick={handleApplyAiCategory}
                      className="px-3 py-1 text-[11px] font-bold bg-[#1F5F91] hover:bg-[#153E63] text-white rounded transition-colors shadow-xs cursor-pointer"
                    >
                      Apply Suggested Category
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Category & Urgency Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#153E63] mb-1">
                  Municipal Category
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as ReportCategory)}
                  className="w-full px-3.5 py-2.5 text-xs text-[#253443] bg-[#F5F7FA] focus:bg-white border border-[#DCE3EA] focus:border-[#1F5F91] rounded-lg focus:outline-hidden transition-colors"
                >
                  <option value="Water & Drainage">Water & Drainage</option>
                  <option value="Roads & Traffic">Roads & Traffic</option>
                  <option value="Public Sanitation">Public Sanitation</option>
                  <option value="Power & Lighting">Power & Lighting</option>
                  <option value="Parks & Environment">Parks & Environment</option>
                  <option value="Structural Safety">Structural Safety</option>
                  <option value="Public Health">Public Health</option>
                  <option value="Noise & Disturbance">Noise & Disturbance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#153E63] mb-1">
                  Perceived Urgency Level
                </label>
                <select
                  value={urgency}
                  onChange={e => setUrgency(e.target.value as UrgencyLevel)}
                  className="w-full px-3.5 py-2.5 text-xs text-[#253443] bg-[#F5F7FA] focus:bg-white border border-[#DCE3EA] focus:border-[#1F5F91] rounded-lg focus:outline-hidden transition-colors"
                >
                  <option value="low">Low (Standard civic maintenance)</option>
                  <option value="medium">Medium (Requires attention within 72h)</option>
                  <option value="high">High (Disrupting traffic or transit)</option>
                  <option value="critical">Critical (Immediate public danger - 24h SLA)</option>
                </select>
              </div>
            </div>

            {/* Administrative Location Hierarchy */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {adminField('State / UT', selectedStateId, states.map(s => ({ id: s.id, name: s.name })), setSelectedStateId, false)}
              {adminField('District', selectedDistrictId, districts.map(d => ({ id: d.id, name: d.name })), setSelectedDistrictId, !selectedStateId)}
              {adminField('Sub-District', selectedSubDistrictId, subDistricts.map(s => ({ id: s.id, name: s.name })), setSelectedSubDistrictId, !selectedDistrictId)}
              {adminField('Block', selectedBlockId, blocks.map(b => ({ id: b.id, name: b.name })), setSelectedBlockId, !selectedSubDistrictId)}
              {adminField('Locality', selectedLocalityId, localities.map(l => ({ id: l.id, name: l.name })), setSelectedLocalityId, !selectedBlockId)}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#153E63] mb-1">
                  Address / Landmark Details
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Street address, building name, etc."
                  className="w-full px-3.5 py-2.5 text-xs text-[#253443] bg-[#F5F7FA] focus:bg-white border border-[#DCE3EA] focus:border-[#1F5F91] rounded-lg focus:outline-hidden transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#153E63] mb-1">
                  Landmark (Optional)
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={e => setLandmark(e.target.value)}
                  placeholder="Near temple, school, etc."
                  className="w-full px-3.5 py-2.5 text-xs text-[#253443] bg-[#F5F7FA] focus:bg-white border border-[#DCE3EA] focus:border-[#1F5F91] rounded-lg focus:outline-hidden transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#153E63] mb-1">
                  Indian PIN Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={pinCode}
                  onChange={e => setPinCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="110001"
                  className="w-full px-3.5 py-2.5 text-xs font-mono tabular-nums text-[#253443] bg-[#F5F7FA] focus:bg-white border border-[#DCE3EA] focus:border-[#1F5F91] rounded-lg focus:outline-hidden transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Right: Interactive Map */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[#153E63] flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                Location Selection
              </span>
              <button
                type="button"
                onClick={handleUseGPS}
                disabled={gpsLoading}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-[#EAF2F8] hover:bg-[#dbeafe] border border-[#DCE3EA] text-[#1F5F91] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {gpsLoading ? (
                  <span className="flex items-center gap-1"><span className="animate-spin"></span> Using GPS...</span>
                ) : (
                  <>
                    <MyLocation className="w-3 h-3" /> Use My Location (GPS)
                  </>
                )}
              </button>
            </div>

            <div className="relative flex-1 bg-[#F5F7FA] border border-[#DCE3EA] rounded-lg overflow-hidden shadow-xs">
              <div ref={containerRef} className="w-full h-64" />
              <div className="absolute top-2 right-2 z-10 flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (mapRef.current) mapRef.current.flyTo(DEFAULT_CENTER, 5);
                  }}
                  className="p-2 bg-white border border-[#DCE3EA] rounded text-[#253443] hover:bg-[#EAF2F8] transition-colors shadow-sm"
                  title="Reset map view"
                >
                  <Home className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleUseGPS}
                  disabled={gpsLoading}
                  className="p-2 bg-white border border-[#DCE3EA] rounded text-[#253443] hover:bg-[#EAF2F8] transition-colors shadow-sm disabled:opacity-50"
                  title="Center on GPS location"
                >
                  <MyLocation className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="text-[#657586] font-medium">Coordinates:</span>
              <span className="font-mono text-[#1F5F91] font-bold">
                {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </span>
              <span className="px-1 text-[#DCE3EA]">|</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                locationSource === 'gps' ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#EAF2F8] text-[#1F5F91]'
              }`}>
                {locationSource === 'gps' ? 'GPS' : locationSource === 'preset' ? 'Preset' : 'Manual Map'}
              </span>
            </div>
          </div>
        </div>

        {/* Location Description */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-[#153E63] mb-0">
              Civic Landmark / Location Description <span className="text-[#B42318]">*</span>
            </label>
            <span className="text-[10px] text-[#657586]">Tap map, use GPS, or enter a description</span>
          </div>
          <input
            type="text"
            required
            value={locationName}
            onChange={e => setLocationName(e.target.value)}
            placeholder="Describe the location (street, landmark, area)"
            className="w-full px-3.5 py-2.5 text-xs text-[#253443] bg-[#F5F7FA] focus:bg-white border border-[#DCE3EA] focus:border-[#1F5F91] rounded-lg focus:outline-hidden transition-colors"
          />
        </div>

        {/* GPS Coordinates (read-only preview) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-medium text-[#657586] mb-1">Latitude</label>
            <input
              type="number"
              step="0.0001"
              value={latitude}
              onChange={e => setLatitude(parseFloat(e.target.value))}
              readOnly
              className="w-full px-3.5 py-2 text-xs font-mono tabular-nums text-[#253443] bg-[#F5F7FA] border border-[#DCE3EA] rounded-lg focus:bg-white focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#657586] mb-1">Longitude</label>
            <input
              type="number"
              step="0.0001"
              value={longitude}
              onChange={e => setLongitude(parseFloat(e.target.value))}
              readOnly
              className="w-full px-3.5 py-2 text-xs font-mono tabular-nums text-[#253443] bg-[#F5F7FA] border border-[#DCE3EA] rounded-lg focus:bg-white focus:outline-hidden"
            />
          </div>
        </div>

        {/* Supporting Evidence / Photographs */}
        <div>
          <label className="block text-xs font-bold text-[#153E63] mb-1">
            Supporting Photographs (Optional Ground Evidence)
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-[#153E63] bg-[#EAF2F8] hover:bg-[#dbeafe] border border-[#DCE3EA] rounded-lg transition-colors">
              <Camera className="w-4 h-4 text-[#1F5F91]" />
              <span>Attach Photos</span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
            <span className="text-[11px] text-[#657586]">Max 4 images (JPG, PNG, WebP up to 2.5MB each)</span>
          </div>

          {images.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-3">
              {images.map((img, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-lg border border-[#DCE3EA] overflow-hidden group shadow-xs">
                  <img src={img} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 p-1 bg-[#B42318] hover:bg-rose-700 text-white rounded shadow-xs transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="border-t border-[#DCE3EA] pt-5 flex items-center justify-between">
          <span className="text-[11px] text-[#657586]">
            All submissions are recorded in municipal audit ledger
          </span>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 text-xs font-bold text-white bg-[#1F5F91] hover:bg-[#153E63] disabled:opacity-50 rounded-lg shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Registering with Municipal Engine...' : 'Submit Grievance'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
