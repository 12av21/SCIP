import { useState } from "react";
import axios from "axios";

export default function SubmitComplaint() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    location: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
    await axios.post(
  "/api/complaints",
  formData
);

      alert("Complaint submitted successfully");

      setFormData({
        title: "",
        description: "",
        category: "",
        location: "",
      });
    } catch (error) {
      console.error(error);
      alert("Submission failed");
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 bg-white p-6 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">
        Submit Complaint
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="title"
          placeholder="Complaint Title"
          value={formData.title}
          onChange={handleChange}
          className="w-full border p-3 rounded"
          required
        />

        <textarea
          name="description"
          placeholder="Describe the issue"
          value={formData.description}
          onChange={handleChange}
          className="w-full border p-3 rounded"
          rows={5}
          required
        />

        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          className="w-full border p-3 rounded"
          required
        >
          <option value="">Select Category</option>
          <option value="Water">Water</option>
          <option value="Electricity">Electricity</option>
          <option value="Road">Road</option>
          <option value="Waste">Waste</option>
          <option value="Health">Health</option>
        </select>

        <input
          name="location"
          placeholder="Location"
          value={formData.location}
          onChange={handleChange}
          className="w-full border p-3 rounded"
          required
        />

        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-3 rounded"
        >
          Submit Complaint
        </button>
      </form>
    </div>
  );
}