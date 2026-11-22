// SCIP Agent - Intelligence Agent Console (Government Digital Portal)
import React, { useState } from 'react';
import { api } from '../../services/apiClient';
import { AgentBriefing, AgentToolResult } from '../../types/scip';
import {
  Sparkles,
  Layers,
  MapPin,
  TrendingUp,
  CheckCircle2,
  Terminal,
  Bot,
  AlertTriangle
} from 'lucide-react';

export const AgentConsoleView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [briefing, setBriefing] = useState<AgentBriefing | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState('');
  const [selectedToolData, setSelectedToolData] = useState<AgentToolResult | null>(null);

  const handleRunAgent = async (promptQuery?: string, specificTool?: string) => {
    const q = (promptQuery ?? query).trim();
    if (!q) return;

    setIsExecuting(true);
    setError('');
    try {
      const brief = await api.runAgentQuery(q, specificTool);
      setBriefing(brief);
      if (brief.toolResults.length > 0) {
        setSelectedToolData(brief.toolResults[0]);
      } else {
        setSelectedToolData(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Agent execution failed.');
    } finally {
      setIsExecuting(false);
    }
  };

  const engineLabel = (() => {
    const m = (briefing?.modelUsed || '').toLowerCase();
    if (!m) return 'Not specified';
    if (m.includes('fallback') || m.includes('deterministic') || m.includes('local') || m.includes('tfidf')) return `Deterministic fallback (${briefing?.modelUsed})`;
    if (m.includes('gemini') || m.includes('google')) return `Gemini (${briefing?.modelUsed})`;
    return briefing?.modelUsed || 'Not specified';
  })();

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-4">
      <div className="border-b border-[#DCE3EA] pb-4">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-[#EAF2F8] text-[#153E63] border border-[#B9D5EB] mb-1.5">
          <Bot className="w-3.5 h-3.5 text-[#1F5F91]" />
          <span>Decision Support</span>
        </div>
        <h1 className="text-xl font-bold text-[#153E63]">Intelligence Analysis Console</h1>
        <p className="text-xs text-[#657586] mt-0.5">
          Run analytical queries against available platform data. Results are advisory and require human review.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-[#DCE3EA] p-5 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#153E63]">Analysis Request</span>
          <span className="text-[#657586] text-[11px]">Uses authorized backend services</span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRunAgent()}
            placeholder="Enter a question or analysis request..."
            className="flex-1 px-3.5 py-2.5 text-xs text-[#253443] bg-white border border-[#DCE3EA] rounded-md focus:outline-hidden focus:border-[#1F5F91]"
          />
          <button
            onClick={() => handleRunAgent()}
            disabled={isExecuting || !query.trim()}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-[#153E63] hover:bg-[#1F5F91] disabled:opacity-50 rounded-md shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#E89B36]" />
            <span>{isExecuting ? 'Running...' : 'Run Analysis'}</span>
          </button>
        </div>

        <div className="bg-[#F5F7FA] border border-[#DCE3EA] rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-[#153E63] text-xs">Direct tools:</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => handleRunAgent(query || 'Run incident clustering analysis', 'clustering')}
              disabled={isExecuting}
              className="px-2.5 py-1 bg-white hover:bg-[#EAF2F8] hover:text-[#153E63] border border-[#DCE3EA] rounded text-[11px] text-[#253443] flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Layers className="w-3 h-3 text-[#1F5F91]" />
              <span>Clustering</span>
            </button>
            <button
              onClick={() => handleRunAgent(query || 'Analyze trends', 'trends')}
              disabled={isExecuting}
              className="px-2.5 py-1 bg-white hover:bg-[#EAF2F8] hover:text-[#153E63] border border-[#DCE3EA] rounded text-[11px] text-[#253443] flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <TrendingUp className="w-3 h-3 text-[#1F5F91]" />
              <span>Trends</span>
            </button>
            <button
              onClick={() => handleRunAgent(query || 'Inspect geospatial hotspots', 'hotspots')}
              disabled={isExecuting}
              className="px-2.5 py-1 bg-white hover:bg-[#EAF2F8] hover:text-[#153E63] border border-[#DCE3EA] rounded text-[11px] text-[#253443] flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <MapPin className="w-3 h-3 text-[#1F5F91]" />
              <span>Geospatial</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg text-xs text-[#991B1B] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {!briefing && !isExecuting && !error && (
        <div className="bg-white rounded-lg border border-[#DCE3EA] p-10 text-center text-xs text-[#657586] shadow-2xs">
          <Bot className="w-8 h-8 mx-auto text-[#1F5F91] mb-2" />
          <div className="font-semibold text-[#153E63]">No analysis results yet</div>
          <p className="mt-1">Enter a request above to run an analysis.</p>
        </div>
      )}

      {briefing && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-[#DCE3EA] p-6 space-y-4 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DCE3EA] pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#153E63] bg-[#EAF2F8] px-2 py-0.5 rounded border border-[#B9D5EB]">
                  {briefing.id}
                </span>
                <span className="text-xs text-[#657586]">·</span>
                <span className="text-xs text-[#657586] font-mono tabular-nums">
                  {new Date(briefing.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-xs text-[#657586]">
                <span>Engine: <strong className="text-[#153E63]">{engineLabel}</strong></span>
                <span className="ml-3">Confidence: <strong className="text-[#153E63]">{(briefing.confidence * 100).toFixed(0)}%</strong></span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-xs text-[#153E63] uppercase tracking-wider">Summary</div>
              <p className="text-xs text-[#253443] leading-relaxed bg-[#F5F7FA] p-4 rounded-lg border border-[#DCE3EA] whitespace-pre-wrap">
                {briefing.executiveSummary || 'No summary returned.'}
              </p>
            </div>

            {briefing.recommendedActions.length > 0 && (
              <div className="space-y-2">
                <div className="font-bold text-xs text-[#153E63] uppercase tracking-wider">Suggested Actions (Advisory)</div>
                <ul className="space-y-1.5 text-xs text-[#253443]">
                  {briefing.recommendedActions.map((act, i) => (
                    <li key={i} className="flex items-start gap-2 bg-[#EAF2F8]/60 p-2.5 rounded border border-[#B9D5EB]">
                      <CheckCircle2 className="w-4 h-4 text-[#1F5F91] shrink-0 mt-0.5" />
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[#A15C00] text-[11px] leading-relaxed">
              <strong>Notice:</strong> {briefing.uncertaintyDisclaimer || 'Automated outputs are advisory and require human review.'}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-[#DCE3EA] overflow-hidden shadow-2xs">
              <div className="px-4 py-3 bg-[#EAF2F8]/70 border-b border-[#DCE3EA] text-xs font-bold text-[#153E63] uppercase tracking-wider flex items-center justify-between">
                <span>Tool Results ({briefing.toolResults.length})</span>
                <Terminal className="w-3.5 h-3.5 text-[#1F5F91]" />
              </div>
              <div className="divide-y divide-[#DCE3EA] text-xs">
                {briefing.toolResults.length === 0 ? (
                  <div className="p-4 text-[#657586]">No tool results returned.</div>
                ) : briefing.toolResults.map(tool => {
                  const isSelected = selectedToolData?.toolName === tool.toolName;
                  return (
                    <div
                      key={tool.toolName}
                      onClick={() => setSelectedToolData(tool)}
                      className={`p-3 cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#EAF2F8] border-l-4 border-[#1F5F91]' : 'hover:bg-[#F5F7FA]'
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold text-[#153E63]">
                        <span>{tool.toolName}</span>
                        <span className="font-mono text-[10px] text-[#657586] tabular-nums">{tool.executionTimeMs}ms</span>
                      </div>
                      <p className="text-[#657586] text-[11px] mt-1 line-clamp-2">{tool.summary}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-lg border border-[#DCE3EA] p-5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#DCE3EA] pb-2">
                <div className="font-bold text-xs text-[#153E63]">
                  Result: {selectedToolData?.toolName || 'Select a tool'}
                </div>
                {selectedToolData && (
                  <span className="text-[11px] font-mono text-[#28834A] font-bold uppercase">Status: {selectedToolData.status}</span>
                )}
              </div>

              {selectedToolData ? (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-[#F5F7FA] rounded border border-[#DCE3EA] text-[#253443]">{selectedToolData.summary}</div>
                  <div className="font-bold text-[#153E63] text-[11px] uppercase tracking-wider">Structured Output</div>
                  <pre className="p-3 bg-[#153E63] text-white rounded-lg text-[11px] font-mono overflow-x-auto max-h-96">
                    {JSON.stringify(selectedToolData.data, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="py-16 text-center text-xs text-[#657586]">Select a tool result to view details.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
