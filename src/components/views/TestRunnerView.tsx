// SCIP Validation - Isolated Automated Test & Audit Status (Government Digital Portal)
import React from 'react';
import { ShieldCheck, Terminal, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export const TestRunnerView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto py-4">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#DCE3EA] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-[#EAF2F8] text-[#153E63] border border-[#B9D5EB] mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1F5F91]" />
            <span>Compliance & Quality Assurance</span>
          </div>
          <h1 className="text-xl font-bold text-[#153E63]">System Validation & Security Audit</h1>
          <p className="text-xs text-[#657586] mt-0.5 max-w-3xl">
            In-process, mutation-based runtime test execution is disabled to protect application data and preserve safe production behavior.
            Validation is performed through isolated automated test suites and CI checks.
          </p>
        </div>
      </div>

      <div className="bg-[#FFF7ED] border border-[#F5C78B] rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-[#B54708] shrink-0 mt-0.5" />
        <div className="text-xs text-[#7A2E0E]">
          <div className="font-semibold mb-1">In-app “Run Audit” is intentionally unavailable</div>
          <div>
            The previous in-process audit endpoint could mutate active state and is not executed from the UI.
            Use the isolated commands below in a dedicated test environment (temporary database path, test secrets, no production data).
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-[#DCE3EA] p-5 shadow-2xs">
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="w-4 h-4 text-[#1F5F91]" />
            <h2 className="text-sm font-bold text-[#153E63]">Isolated Automated Test Commands</h2>
          </div>
          <div className="space-y-2 text-xs text-[#253443]">
            <div className="p-2.5 rounded border border-[#DCE3EA] bg-[#F5F7FA] font-mono">npm run typecheck</div>
            <div className="p-2.5 rounded border border-[#DCE3EA] bg-[#F5F7FA] font-mono">npm run test:security</div>
            <div className="p-2.5 rounded border border-[#DCE3EA] bg-[#F5F7FA] font-mono">npm run test:security:http</div>
            <div className="p-2.5 rounded border border-[#DCE3EA] bg-[#F5F7FA] font-mono">npm run test:security:all</div>
            <div className="p-2.5 rounded border border-[#DCE3EA] bg-[#F5F7FA] font-mono">npm run build</div>
          </div>
          <p className="text-[11px] text-[#657586] mt-3">
            HTTP tests run against an isolated temporary database and ephemeral localhost server; smoke tests use isolated temp DB fixtures. No existing application data is modified.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-[#DCE3EA] p-5 shadow-2xs">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-[#28834A]" />
            <h2 className="text-sm font-bold text-[#153E63]">Coverage Areas (Isolated Suites)</h2>
          </div>
          <ul className="text-xs text-[#253443] space-y-1.5 list-disc list-inside">
            <li>Authentication, session revocation/suspension, and credential-reset enforcement</li>
            <li>RBAC/permission boundaries and role-based access controls</li>
            <li>Ownership/department scoping and PII minimization in hardened responses/exports</li>
            <li>Input validation, allowlists, workflow/state guards, and safe error behavior</li>
            <li>Audit integrity verification and tamper-detection checks (isolated copies)</li>
            <li>Security headers, CORS preflight behavior, endpoint lockdown (seed/tests/demo-login), and health/404 handling</li>
          </ul>
          <div className="mt-3 flex items-start gap-2 text-[11px] text-[#657586]">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>CI executes typecheck and isolated security suites (see <code>.github/workflows/ci.yml</code>). Passing isolated checks do not by themselves constitute production certification.</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#DCE3EA] p-5 shadow-2xs">
        <h2 className="text-sm font-bold text-[#153E63] mb-2">Responsible AI & Decision Support Notice</h2>
        <p className="text-xs text-[#253443] leading-relaxed">
          AI/ML components provide classification, similarity, clustering, trend, and risk analysis as decision support.
          Outputs are probabilistic interpretations of reported observations and may be incomplete or incorrect.
          Human review, verification, and authorized administrative judgment remain required for operational decisions.
        </p>
      </div>
    </div>
  );
};
