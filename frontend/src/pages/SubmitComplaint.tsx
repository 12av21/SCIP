import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Send, Sparkles, MapPin, FileText } from 'lucide-react';

export default function SubmitComplaint() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('Water');
  const [isTriaging, setIsTriaging] = useState(false);
  const [aiSuggested, setAiSuggested] = useState(false);
  const navigate = useNavigate();

  const handleTriage = async () => {
    if (!description || description.length < 15) {
      toast.error("Please provide a bit more detail for AI analysis.");
      return;
    }

    setIsTriaging(true);
    try {
      // Real implementation would call the backend ai_service.py logic
      const response = await axios.post('/api/ai/triage', { description });
      const { suggestedCategory, suggestedPriority } = response.data;
      
      setCategory(suggestedCategory);
      setAiSuggested(true);
      toast.success(`AI suggests: ${suggestedCategory} (${suggestedPriority} priority)`, {
        icon: '✨',
        duration: 4000
      });
    } catch (error) {
      console.warn("AI Triage backend not reached. Using local mock.");
      // Simulate network delay for mock fallback
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockCat = description.toLowerCase().includes('wire') ? 'Electricity' : 'Water';
      setCategory(mockCat);
      setAiSuggested(true);
      toast.success(`AI suggests: ${mockCat}`, { icon: '✨' });
    } finally {
      setIsTriaging(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/complaints', {
        title, description, location, category, status: 'Pending'
      });
      toast.success("Case-file created successfully.");
      navigate('/citizen/history');
    } catch (error) {
      toast.error("Failed to submit case.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-brass-bg rounded-2xl">
          <FileText className="text-brass" size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-display">New Civic Case-File</h1>
          <p className="opacity-60 text-sm">Citizen Documentation Portal</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="stamp-card p-8 space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-widest opacity-50">Subject Title</label>
          <input required className="field w-full" placeholder="Brief title of the issue..." value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-widest opacity-50">Location / Area</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={16} />
              <input required className="field w-full pl-10" placeholder="Sector or Ward..." value={location} onChange={e => setLocation(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-widest opacity-50">Department</label>
            <select className="field w-full" value={category} onChange={e => setCategory(e.target.value)}>
              {['Water', 'Electricity', 'Road', 'Waste', 'Health'].map(c => <option key={c}>{c}</option>)}
            </select>
            {aiSuggested && <p className="text-[10px] text-brass font-bold animate-pulse">✨ AI Suggested</p>}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <label className="text-xs font-mono uppercase tracking-widest opacity-50">Detailed Description</label>
            <button type="button" onClick={handleTriage} disabled={isTriaging} className="landing-tag !mb-0 !py-1 flex items-center gap-1.5 hover:brightness-95 transition-all">
              <Sparkles size={12} />
              {isTriaging ? 'ANALYZING...' : 'AI TRIAGE'}
            </button>
          </div>
          <textarea required rows={5} className="field w-full resize-none" placeholder="Provide context and impact..." value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        <div className="pt-4 border-t border-ink/5 flex justify-end">
          <button type="submit" className="bg-ink text-paper px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform shadow-lg">
            File Official Report <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}