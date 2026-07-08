import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen h-[100dvh] bg-gradient-dusk text-white flex flex-col">
      <div className="shrink-0 z-10 bg-brand-midnight/90 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-4 px-6 py-4 pt-safe">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-serif font-bold">Privacy Policy</h1>
        </div>
      </div>

      <div
        className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pt-6 pb-12 pb-safe"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="pointer-events-none absolute -top-24 right-[-10%] w-80 h-80 bg-brand-gold/10 rounded-full blur-[90px]" />
        <div className="pointer-events-none absolute bottom-[-10%] left-[-10%] w-72 h-72 bg-brand-primary/15 rounded-full blur-[90px]" />

        <div className="relative max-w-3xl mx-auto">
          <div className="bg-white/95 dark:bg-brand-darkSurface/95 text-brand-dark dark:text-brand-darkText rounded-3xl p-6 md:p-10 shadow-2xl border border-brand-light/60 dark:border-brand-darkBorder/60">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 dark:bg-brand-gold/20 flex items-center justify-center">
                <ShieldCheck size={20} className="text-brand-primary dark:text-brand-gold" />
              </div>
              <p className="text-sm md:text-base text-brand-medium/80 dark:text-brand-darkTextMuted/80">
                At The School of Breath, operated by PossibilityAI Inc, your privacy is important to us. This privacy
                policy explains what personal data we collect, how we use it, and your rights regarding your data.
              </p>
            </div>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">Personal Data We Collect</h2>
            <ul className="list-disc pl-5 text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              <li>Name, email, and password for account creation and secure login.</li>
              <li>Microphone and camera access to record and submit audio or video feedback about our courses.</li>
              <li>Video storage access to allow you to upload video-based feedback.</li>
              <li>User feedback (text input). Any feedback you provide via text is emailed to us and not shared with any third party.</li>
            </ul>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">Purpose of Data Collection</h2>
            <ul className="list-disc pl-5 text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              <li>Provide and maintain our services.</li>
              <li>Collect and address feedback for improving our courses.</li>
              <li>Manage your account and provide customer support.</li>
            </ul>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">Permissions</h2>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              We request your consent to access the microphone, camera, and video storage, which will only be used for course
              feedback purposes. You have the full right to deny or revoke these permissions at any time.
            </p>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">Your Rights Under GDPR (EU)</h2>
            <ul className="list-disc pl-5 text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-4">
              <li>Access: request details about the data we collect and process.</li>
              <li>Rectification: correct inaccuracies in your personal data.</li>
              <li>Erasure: request deletion of your data under certain conditions.</li>
              <li>Data portability: request a copy of your data in a structured, commonly used format.</li>
              <li>Restrict processing: opt-out of specific types of data processing or restrict how we process your data.</li>
              <li>Withdraw consent: revoke consent at any time where applicable.</li>
              <li>Necessity of data collection: we collect only the data strictly necessary to enable app functionality.</li>
            </ul>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              To exercise these rights, contact us at{' '}
              <a
                href="mailto:connect@meditatewithabhi.com"
                className="text-brand-primary dark:text-brand-gold font-semibold underline"
              >
                connect@meditatewithabhi.com
              </a>
              .
            </p>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">Your Rights Under CCPA (California)</h2>
            <ul className="list-disc pl-5 text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-4">
              <li>Right to know: request information on the categories and specific pieces of personal data we have collected about you.</li>
              <li>Right to delete: request the deletion of your personal data, subject to legal and contractual obligations.</li>
              <li>Right to opt-out: opt-out of the sale of your personal data.</li>
              <li>Non-discrimination: you will not be discriminated against for exercising these rights.</li>
            </ul>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              To exercise these rights, contact us at{' '}
              <a
                href="mailto:connect@meditatewithabhi.com"
                className="text-brand-primary dark:text-brand-gold font-semibold underline"
              >
                connect@meditatewithabhi.com
              </a>
              .
            </p>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">Data Security</h2>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              We employ commercially reasonable measures to secure your data. However, no system is completely secure, and we
              cannot guarantee absolute security.
            </p>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">Data Retention and Deletion</h2>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              We retain your data for as long as necessary to fulfill the purposes outlined in this policy. You can request the
              deletion of your data by contacting us at connect@meditatewithabhi.com.
            </p>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">Children&apos;s Privacy</h2>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              Our service is not intended for anyone under the age of 13. We do not knowingly collect personal data from children
              under 13.
            </p>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">Changes to This Policy</h2>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              We may update this privacy policy from time to time. You will be notified of any significant changes via email and/or
              a prominent notice on our platform.
            </p>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">Contact Us</h2>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted">
              If you have any questions about this privacy policy, please contact us at{' '}
              <a
                href="mailto:connect@meditatewithabhi.com"
                className="text-brand-primary dark:text-brand-gold font-semibold underline"
              >
                connect@meditatewithabhi.com
              </a>
              .
            </p>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mt-3">
              Mail: PossibilityAI Inc, 6244 Lansdowne Circle, Boynton Beach, FL 33472, USA
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
