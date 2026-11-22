import React from 'react';

export const TermsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6 text-[#253443]">
      <div className="border-b border-[#DCE3EA] pb-4">
        <h1 className="text-2xl font-bold text-[#153E63]">Terms and Conditions</h1>
        <p className="text-sm text-[#657586] mt-1">Terms governing use of this platform.</p>
      </div>

      <div className="bg-white border border-[#DCE3EA] rounded-xl p-6 space-y-4 text-sm text-[#657586] leading-relaxed shadow-xs">
        <section className="space-y-2">
          <h2 className="font-bold text-[#153E63] text-base">Acceptance of Terms</h2>
          <p>By using the Smart Community Intelligence Platform (SCIP), you agree to use the platform responsibly and in accordance with applicable laws and the policies of the deploying organization.</p>
        </section>
        <section className="space-y-2">
          <h2 className="font-bold text-[#153E63] text-base">Appropriate Use</h2>
          <p>Submit accurate and relevant information. Do not submit false reports, unlawful content, or information that infringes on the rights of others. Misuse of the platform may result in restricted access as permitted by policy.</p>
        </section>
        <section className="space-y-2">
          <h2 className="font-bold text-[#153E63] text-base">No Emergency Service</h2>
          <p>This platform is not an emergency service. In situations involving immediate danger to life or property, contact local emergency services directly.</p>
        </section>
        <section className="space-y-2">
          <h2 className="font-bold text-[#153E63] text-base">Advisory Outputs</h2>
          <p>Any automated analysis or status information provided by the platform is for informational and decision-support purposes and may be subject to review, correction, or change by authorized personnel.</p>
        </section>
        <section className="space-y-2">
          <h2 className="font-bold text-[#153E63] text-base">Changes</h2>
          <p>Terms and platform functionality may be updated by the deploying organization. Continued use of the platform constitutes acceptance of applicable terms.</p>
        </section>
      </div>
    </div>
  );
};
