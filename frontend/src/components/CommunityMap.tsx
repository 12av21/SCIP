import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "./CommunityMap.css";

// Import Leaflet assets directly to resolve bundler loading errors
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Delete default loader to override with safe assets
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface Complaint {
  id: string;
  title: string;
  location: string;
  status: string;
  lat?: number;
  lng?: number;
}

interface Props {
  complaints: Complaint[];
}

export default function CommunityMap({ complaints }: Props) {
  return (
    <div className="card community-map">
      <div className="community-map-head">
        <h2>Complaint Map</h2>
        <p>{complaints.length} active pins</p>
      </div>

      <div className="community-map-frame">
        <MapContainer center={[26.8467, 80.9462]} zoom={11} style={{ height: "520px", width: "100%" }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {complaints.map((item) => {
            // Apply numeric index-shifted coordinate fallback for any old/legacy reports that have no coordinate attributes
            const idSeed = parseInt(item.id.replace(/\D/g, "").slice(-4)) || 0;
            const lat = typeof item.lat === "number" && !isNaN(item.lat) 
              ? item.lat 
              : 26.8467 + (idSeed % 100) * 0.002 - 0.1;
            const lng = typeof item.lng === "number" && !isNaN(item.lng) 
              ? item.lng 
              : 80.9462 + (idSeed % 100) * 0.002 - 0.1;

            return (
              <Marker key={item.id} position={[lat, lng]}>
                <Popup>
                  <div className="p-1">
                    <strong className="text-slate-900 font-bold block mb-1">{item.title}</strong>
                    <span className="text-slate-500 text-xs block mb-1">{item.location}</span>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono leading-none tracking-wide text-white uppercase ${
                      item.status === 'Resolved' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}>{item.status}</span>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
