'use client';

import React from 'react';
import Link from 'next/link';
import { triggerHapticFeedback } from '@/utils/ui';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-ura-panel text-white">
      <div className="sticky top-0 z-10 bg-ura-panel border-b border-ura-border/75 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-[#f3ba2f]">Terms of Service</h1>
        <Link
          href="/clicker"
          onClick={() => triggerHapticFeedback(window)}
          className="text-sm text-[#f3ba2f] font-medium"
        >
          Back to app
        </Link>
      </div>
      <div className="px-4 py-6 pb-24 max-w-xl mx-auto prose prose-invert prose-sm">
        <p className="text-gray-400 text-xs mb-4">Last updated: February 2025</p>

        <h2 className="text-white font-semibold mt-6 mb-2">1. Acceptance of Terms</h2>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          By accessing or using URAPearls (&quot;the app&quot;), you agree to these Terms of Service and our Privacy Policy. If you do not agree, do not use the app.
        </p>

        <h2 className="text-white font-semibold mt-6 mb-2">2. Description of Service</h2>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          URAPearls is a Telegram Mini App that allows you to earn in-app points (PEARLS) by tapping, completing tasks, referring friends, staking, and playing mini-games. PEARLS and other in-app rewards have no guaranteed real-world value unless otherwise stated in the app or by the operator. We may add, change, or discontinue features at any time.
        </p>

        <h2 className="text-white font-semibold mt-6 mb-2">3. Eligibility and Account</h2>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          You must be at least 13 years old (or the age of majority in your jurisdiction) and have a valid Telegram account to use the app. Your use of the app is linked to your Telegram identity. You are responsible for keeping your Telegram account secure. One person per Telegram account; duplicate or fake accounts may be suspended.
        </p>

        <h2 className="text-white font-semibold mt-6 mb-2">4. Acceptable Use</h2>
        <p className="text-gray-300 text-sm leading-relaxed mb-2">You agree not to:</p>
        <ul className="list-disc pl-5 text-gray-300 text-sm space-y-1 mb-4">
          <li>Use bots, scripts, or automation to gain unfair advantage</li>
          <li>Abuse referrals, tasks, or rewards (e.g. fake accounts, fraud)</li>
          <li>Attempt to hack, reverse-engineer, or disrupt the app or its infrastructure</li>
          <li>Use the app for any illegal purpose or in violation of Telegram&apos;s terms</li>
          <li>Resell, sublicense, or commercially exploit the app without permission</li>
        </ul>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          We may suspend or terminate your access if you breach these terms or for operational or legal reasons.
        </p>

        <h2 className="text-white font-semibold mt-6 mb-2">5. In-App Points and Rewards</h2>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          PEARLS and other in-app rewards are granted at our discretion and may be changed or discontinued. Unless we explicitly state otherwise in the app, they are for in-app use only and do not constitute a promise of real-world payment. Staking, airdrops, Lumina ID, and wallet-related features may be subject to additional terms and eligibility rules.
        </p>

        <h2 className="text-white font-semibold mt-6 mb-2">6. Referrals and Tasks</h2>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          Referral and task rewards are subject to our verification. We may withhold or revoke rewards for suspected fraud, abuse, or violation of these terms. Task completion (e.g. joining channels, watching videos, redeeming codes) must be done fairly and in line with the task instructions.
        </p>

        <h2 className="text-white font-semibold mt-6 mb-2">7. Disclaimer of Warranties</h2>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          The app is provided &quot;as is&quot; and &quot;as available&quot;. We do not warrant that it will be uninterrupted, error-free, or free of harmful components. You use the app at your own risk.
        </p>

        <h2 className="text-white font-semibold mt-6 mb-2">8. Limitation of Liability</h2>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          To the maximum extent permitted by law, we and our affiliates are not liable for any indirect, incidental, special, or consequential damages, or for loss of data, profits, or in-app rewards, arising from your use or inability to use the app.
        </p>

        <h2 className="text-white font-semibold mt-6 mb-2">9. Changes to Terms</h2>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          We may update these Terms of Service at any time. We will notify users of material changes (e.g. via in-app notice or Telegram). Continued use after the effective date of changes means you accept the new terms.
        </p>

        <h2 className="text-white font-semibold mt-6 mb-2">10. Governing Law and Contact</h2>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">
          These terms are governed by the laws applicable to the operator of URAPearls. For questions or disputes, contact us via the official URAPearls Telegram channel or support contact provided in the app.
        </p>
      </div>
    </div>
  );
}
