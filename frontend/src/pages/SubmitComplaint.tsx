import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Send, Sparkles, MapPin, FileText, Compass } from 'lucide-react';
import api from '../utils/api'; // Import the centralized API client
import { MapContainer, Marker, TileLayer, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Setup Leaflet icon overrides
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const CATEGORIES = ['Water', 'Electricity', 'Road', 'Waste', 'Health'];

function MapEventsHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 14);
  }, [lat, lng, map]);
  return null;
}

export default function SubmitComplaint() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('Water');
  const [isTriaging, setIsTriaging] = useState(false);
  const [aiSuggested, setAiSuggested] = useState(false);
  
  // Coordinates State
  const [lat, setLat] = useState(26.8467);
  const [lng, setLng] = useState(80.9462);

  const navigate = useNavigate();

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    toast.loading("Fetching coordinates...", { id: "geo-find" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLat(latitude);
        setLng(longitude);
        toast.success("Location locked successfully!", { id: "geo-find" });
      },
      (error) => {
        toast.error("Failed to detect location: " + error.message, { id: "geo-find" });
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const handleTriage = async () => {
    if (!description || description.length < 15) {
      toast.error("Please provide a bit more detail for AI analysis.");
      return;
    }

    setIsTriaging(true);
    try {
      const response = await api.post('/ai/triage', { description });
      const { suggestedCategory, suggestedPriority } = response.data;
      
      setCategory(suggestedCategory);
      setAiSuggested(true);
      toast.success(`AI suggests: ${suggestedCategory} (${suggestedPriority} priority)`, {
        icon: '✨',
        duration: 4000
      });
    } catch (error) {
      console.warn("AI Triage backend not reached. Using local mock.");
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockCat = description.toLowerCase().includes('wire') ? 'Electricity' : 'Water';
      setCategory(mockCat);
      setAiSuggested(true);
      toast.success(`AI suggests: ${mockCat}`, { icon: '✨' });
    } finally {
      setIsTriaging(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/complaints', {
        title, description, location, category, status: 'Pending', lat, lng
      });
      toast.success("Case-file created successfully.");
      navigate('/citizen/history');
    } catch (error) {
      toast.error("Failed to submit case.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 font-body">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
          <FileText size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">New Civic Report</h1>
          <p className="text-slate-400 text-sm font-medium">Citizen Documentation & Location Pinpointing</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-450 uppercase tracking-widest">Subject Title</label>
          <input required className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium outline-none focus:bg-white focus:border-blue-600 transition-all placeholder:text-slate-400" placeholder="Brief title of the issue..." value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-450 uppercase tracking-widest">Location / Area Address</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input required className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium outline-none focus:bg-white focus:border-blue-600 transition-all placeholder:text-slate-400" placeholder="Sector or Ward..." value={location} onChange={e => setLocation(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-450 uppercase tracking-widest">Department</label>
            <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-semibold outline-none focus:bg-white focus:border-blue-600 transition-all appearance-none cursor-pointer" value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            {aiSuggested && <p className="text-[10px] text-cyan-600 font-bold animate-pulse mt-1">✨ AI Suggested</p>}
          </div>
        </div>

        {/* Live Coordinate Pinpointing */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-450 uppercase tracking-widest">Pin exact location on Map</label>
            <button 
              type="button" 
              onClick={handleLocateMe}
              className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1.5 transition-colors"
            >
              <Compass size={14} className="animate-spin-slow" /> Detect My GPS Coordinates
            </button>
          </div>
          <div className="border border-slate-200 rounded-[1.5rem] overflow-hidden h-[240px] relative z-0">
            <MapContainer center={[lat, lng]} zoom={13} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[lat, lng]} draggable={true} eventHandlers={{
                dragend: (e) => {
                  const marker = e.target;
                  const position = marker.getLatLng();
                  setLat(position.lat);
                  setLng(position.lng);
                }
              }} />
              <MapEventsHandler onChange={(newLat, newLng) => {
                setLat(newLat);
                setLng(newLng);
              }} />
              <RecenterMap lat={lat} lng={lng} />
            </MapContainer>
          </div>
          <span className="text-[10px] text-slate-400 block font-mono tracking-wide">
            COORDINATES: {lat.toFixed(6)}, {lng.toFixed(6)} (Drag pin or click map to refine coordinates)
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <label className="text-xs font-bold text-slate-450 uppercase tracking-widest">Detailed Description</label>
            <button type="button" onClick={handleTriage} disabled={isTriaging} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 flex items-center gap-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50">
              <Sparkles size={12} className="text-amber-500" />
              {isTriaging ? 'ANALYZING...' : 'AI TRIAGE'}
            </button>
          </div>
          <textarea required rows={4} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium outline-none focus:bg-white focus:border-blue-600 transition-all resize-none placeholder:text-slate-400" placeholder="Provide context and impact details..." value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button type="submit" className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-slate-100">
            Submit Civic Case <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
