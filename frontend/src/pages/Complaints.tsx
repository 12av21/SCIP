import { useEffect, useState } from "react";
import axios from "axios";
interface Complaint {

  id: string;

  title: string;

  description: string;

  category: string;

  location: string;

  status: string;

  createdAt: string;

  priority: {
    score: number;
    level: string;
  };

}

export default function Complaints() {
const [search, setSearch] = useState("");

const [complaints, setComplaints] =
  useState<Complaint[]>([]);

const [categoryFilter, setCategoryFilter] =
  useState("All");

const [statusFilter, setStatusFilter] =
  useState("All");

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const response = await axios.get("/api/complaints");
      setComplaints(response.data);
    } catch (error) {
      console.error(error);
    }
  };
const updateStatus = async (
  id: string,
  status: string
) => {
  try {
    await axios.patch(
      `/api/complaints/${id}/status`,
      { status }
    );

    fetchComplaints();
  } catch (error) {
    console.error(error);
  }
};
const filteredComplaints =
  complaints.filter((item) => {

    const matchesSearch =
      item.title
        .toLowerCase()
        .includes(search.toLowerCase()) ||

      item.location
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchesCategory =
      categoryFilter === "All" ||
      item.category === categoryFilter;

    const matchesStatus =
      statusFilter === "All" ||
      item.status === statusFilter;

    return (
      matchesSearch &&
      matchesCategory &&
      matchesStatus
    );

  });
 return (
  <div className="p-6">
    <h1 className="text-3xl font-bold mb-6">
      Community Complaints
    </h1>

<div className="flex gap-4 mb-6 flex-wrap">

<input
placeholder="Search complaints..."
value={search}
onChange={(e)=>
setSearch(e.target.value)
}
className="border rounded-lg px-4 py-2 w-80"
/>

<select
value={categoryFilter}
onChange={(e)=>
setCategoryFilter(
e.target.value
)
}
className="border rounded-lg px-4 py-2"
>

<option>All</option>

<option>Water</option>

<option>Electricity</option>

<option>Road</option>

<option>Waste</option>

<option>Health</option>

</select>

<select
value={statusFilter}
onChange={(e)=>
setStatusFilter(
e.target.value
)
}
className="border rounded-lg px-4 py-2"
>

<option>All</option>

<option>Pending</option>

<option>In Progress</option>

<option>Resolved</option>

</select>

</div>
    <div className="space-y-4">
      {
      filteredComplaints.map((complaint: Complaint) => (
        <div
          key={complaint.id}
          className="bg-white rounded-xl shadow p-5"
        >
          <h2 className="text-xl font-bold">
            {complaint.title}
          </h2>

          <p className="mt-2">
            {complaint.description}
          </p>

          <div className="flex gap-3 mt-4">
            <span className="bg-blue-100 px-3 py-1 rounded">
              {complaint.category}
            </span>

            <span className="bg-green-100 px-3 py-1 rounded">
              {complaint.location}
            </span>

            <span className="bg-yellow-100 px-3 py-1 rounded">
              {complaint.status}
            </span>
          </div>

  <div className="mt-4">
  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full">
    Priority:
    {" "}
    {complaint.priority.level}
    {" "}
    ({complaint.priority.score})

    </span>
    </div>
          <div className="mt-5 flex gap-3">

            <button
              onClick={() =>
                updateStatus(
                  complaint.id,
                  "Pending"
                )
              }
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded"
            >
              Pending
            </button>

            <button
              onClick={() =>
                updateStatus(
                  complaint.id,
                  "In Progress"
                )
              }
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded"
            >
              In Progress
            </button>

            <button
              onClick={() =>
                updateStatus(
                  complaint.id,
                  "Resolved"
                )
              }
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded"
            >
              Resolve
            </button>
          </div>

        </div>
        
      ))}
    </div>
  </div>
);
}