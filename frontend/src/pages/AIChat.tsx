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
      <div className="relative">
        <div className="gemini-glow !top-0 !right-0 opacity-40" />
        
        <h1 className="text-3xl font-display mb-2">Intelligence Terminal</h1>
        <p className="opacity-60 text-sm mb-8">Consult Gemini on community trends, historical data, and risk mitigation.</p>

        <div className="stamp-card chat-card section-gap !bg-paper/80 backdrop-blur-sm relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest opacity-50">SCIP-CORE Linked</span>
          </div>

          <textarea
            className="field w-full !bg-transparent border-none focus:ring-0 text-lg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="How has the water crisis in Kakori changed over the last quarter?"
            style={{ padding: 0 }}
          />

          <div className="flex justify-end mt-4">
            <button 
              onClick={askAI} 
              disabled={loading} 
              className="bg-ink text-paper px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50"
            >
              {loading ? (
                "Synthesizing..."
              ) : (
                <>
                  <Send size={16} /> Execute Inquiry
                </>
              )}
            </button>
          </div>

          {reply && (
            <div className="chat-reply mt-8 p-6 bg-white/50 rounded-2xl border border-brass/20 animate-in fade-in slide-in-from-top-4">
              <h3 className="text-xs font-mono uppercase tracking-widest text-brass mb-3 flex items-center gap-2">
                <Sparkles size={14} /> Intelligence Synthesis
              </h3>
              <p className="leading-relaxed text-ink/90 font-medium">{reply}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
