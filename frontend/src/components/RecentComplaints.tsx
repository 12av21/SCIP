import StatusBadge from "./StatusBadge";

export default function RecentComplaints({
  complaints,
}: any) {
  return (
    <div className="bg-white rounded-xl shadow p-6">

      <h2 className="text-xl font-bold mb-4">
        Recent Complaints
      </h2>

      <table className="w-full">

        <thead>
          <tr>
            <th>Title</th>
            <th>Area</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>

          {complaints.map(
            (item: any) => (
              <tr
                key={item.id}
                className="border-t"
              >
                <td>{item.title}</td>

                <td>
                  {item.location}
                </td>

                <td>
                  <StatusBadge
                    status={
                      item.status
                    }
                  />
                </td>
              </tr>
            )
          )}

        </tbody>

      </table>

    </div>
  );
}