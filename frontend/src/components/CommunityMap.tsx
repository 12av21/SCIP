import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "./CommunityMap.css";

interface Complaint {
  id: string;
  title: string;
  location: string;
  status: string;
  lat: number;
  lng: number;
}

interface Props {
  complaints: Complaint[];
}

export default function CommunityMap({ complaints }: Props) {
  return (
    <div className="card community-map">
      <div className="community-map-head">
        <h2>Complaint map</h2>
        <p>{complaints.length} active pins</p>
      </div>

      <div className="community-map-frame">
        <MapContainer center={[26.8467, 80.9462]} zoom={11} style={{ height: "520px", width: "100%" }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {complaints.map((item) => (
            <Marker key={item.id} position={[item.lat, item.lng]}>
              <Popup>
                <strong>{item.title}</strong>
                <br />
                {item.location}
                <br />
                <span className="mono">{item.status}</span>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
