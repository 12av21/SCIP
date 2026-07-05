import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Sparkles, Send } from "lucide-react";

export default function AIChat() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  const askAI = async () => {
    if (!message.trim()) return;
    setLoading(true);
    try {
      const response = await axios.post("/api/ai/chat", { message });
      setReply(response.data.reply);
    } catch (error) {
      console.error(error);
      toast.error("The assistant couldn't respond. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1>AI community assistant</h1>
      <p>Ask about complaint trends, risk areas, or how to file a case.</p>

      <div className="card chat-card section-gap">
        <textarea
          className="field"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="Ask a question…"
        />

        <button onClick={askAI} disabled={loading} className="btn btn-primary" style={{ marginTop: 14 }}>
          {loading ? (
            "Thinking…"
          ) : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Send size={15} /> Ask AI
            </span>
          )}
        </button>

        {reply && (
          <div className="chat-reply">
            <h3>
              <Sparkles size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />
              AI response
            </h3>
            <p>{reply}</p>
          </div>
        )}
      </div>
    </>
  );
}
