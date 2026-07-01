import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
} from "react-leaflet";

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

export default function CommunityMap({
  complaints,
}: Props) {
  return (
    <MapContainer
      center={[26.8467, 80.9462]}
      zoom={11}
      style={{
        height: "600px",
        width: "100%",
      }}
    >
      <TileLayer
        attribution="© OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {complaints.map((item) => (
        <Marker
          key={item.id}
          position={[
            item.lat,
            item.lng,
          ]}
        >
          <Popup>
            <strong>
              {item.title}
            </strong>

            <br />

            {item.location}

            <br />

            {item.status}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}