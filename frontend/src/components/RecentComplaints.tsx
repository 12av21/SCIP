import StatusBadge from "./StatusBadge";
import "./RecentComplaints.css";

interface ComplaintRow {
  id: string;
  title: string;
  location: string;
  status: string;
}

interface Props {
  complaints: ComplaintRow[];
}

export default function RecentComplaints({ complaints }: Props) {
  return (
    <div className="card recent-complaints">
      <h2>Recent complaints</h2>

      <table>
        <thead>
          <tr>
            <th>Case</th>
            <th>Title</th>
            <th>Area</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {complaints.map((item) => (
            <tr key={item.id}>
              <td className="mono recent-complaints-id">{item.id}</td>
              <td>{item.title}</td>
              <td>{item.location}</td>
              <td>
                <StatusBadge status={item.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {complaints.length === 0 && (
        <p className="recent-complaints-empty">No complaints filed yet.</p>
      )}
    </div>
  );
}
