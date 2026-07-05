import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

export default function SubmitComplaint() {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    location: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post("/api/complaints", formData);
      toast.success("Complaint filed successfully.");
      setFormData({ title: "", description: "", category: "", location: "" });
    } catch (error) {
      console.error(error);
      toast.error("Submission failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="stamp-card" style={{ maxWidth: 560, margin: "0 auto", padding: 28 }}>
      <span className="stamp-id">New case filing</span>

      <h1 style={{ fontSize: 24, marginTop: 22 }}>Submit a complaint</h1>

      <form onSubmit={handleSubmit} className="form-stack" style={{ marginTop: 16 }}>
        <input
          name="title"
          placeholder="Complaint title"
          value={formData.title}
          onChange={handleChange}
          className="field"
          required
        />

        <textarea
          name="description"
          placeholder="Describe the issue"
          value={formData.description}
          onChange={handleChange}
          className="field"
          rows={5}
          required
        />

        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          className="field"
          required
        >
          <option value="">Select category</option>
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
          className="field"
          required
        />

        <button type="submit" disabled={submitting} className="btn btn-primary">
          {submitting ? "Submitting…" : "Submit complaint"}
        </button>
      </form>
    </div>
  );
}
