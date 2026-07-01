import { useState } from "react";
import axios from "axios";
import DashboardLayout from "../layouts/DashboardLayout";

export default function AIChat() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");

  const askAI = async () => {
    try {
      const response = await axios.post(
        "/api/ai/chat",
        {
          message,
        }
      );

      setReply(response.data.reply);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">
        AI Community Assistant
      </h1>

      <div className="bg-white p-6 rounded shadow">

        <textarea
          value={message}
          onChange={(e) =>
            setMessage(e.target.value)
          }
          className="w-full border p-3 rounded"
          rows={5}
          placeholder="Ask a question..."
        />

        <button
          onClick={askAI}
          className="mt-4 bg-blue-600 text-white px-6 py-3 rounded"
        >
          Ask AI
        </button>

        {reply && (
          <div className="mt-6 p-4 bg-gray-100 rounded">
            <h3 className="font-bold mb-2">
              AI Response
            </h3>

            <p>{reply}</p>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}