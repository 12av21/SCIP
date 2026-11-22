import React from 'react';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6 text-[#253443]">
      <div className="border-b border-[#DCE3EA] pb-4">
        <h1 className="text-2xl font-bold text-[#153E63]">Privacy Policy</h1>
        <p className="text-sm text-[#657586] mt-1">Information about how data is handled on this platform.</p>
      </div>

      <div className="bg-white border border-[#DCE3EA] rounded-xl p-6 space-y-4 text-sm text-[#657586] leading-relaxed shadow-xs">
        <section className="space-y-2">
          <h2 className="font-bold text-[#153E63] text-base">Overview</h2>
          <p>This page describes general privacy practices for the Smart Community Intelligence Platform (SCIP). Specific practices may depend on the policies of the deploying organization.</p>
        </section>
        <section className="space-y-2">
          <h2 className="font-bold text-[#153E63] text-base">Information You Provide</h2>
          <p>When you submit a report or use platform services, you may provide information such as descriptions, location details, images, and account-related information. Provide only information necessary for your submission.</p>
        </section>
        <section className="space-y-2">
          <h2 className="font-bold text-[#153E63] text-base">Use of Information</h2>
          <p>Information submitted through the platform is used to support report intake, review, coordination, and service delivery by authorized personnel, in accordance with applicable policies.</p>
        </section>
        <section className="space-y-2">
          <h2 className="font-bold text-[#153E63] text-base">Access and Security</h2>
          <p>Access to information is intended to be limited to authorized users based on role and operational need. Security controls are applied as configured by the deployment.</p>
        </section>
        <section className="space-y-2">
          <h2 className="font-bold text-[#153E63] text-base">Contact</h2>
          <p>For questions about privacy practices specific to your deployment, refer to the Contact page or the deploying organization’s official channels.</p>
        </section>
      </div>
    </div>
  );
};
