"use client";

import Link from "next/link";
import { TuitionHubCheckoutExplainer } from "@/components/admin/TuitionHubCheckoutExplainer";
import { OrgFaviconSettings } from "@/components/admin/OrgFaviconSettings";
import { AdmissionFormatSettings } from "@/components/admin/AdmissionFormatSettings";
import { OrgLetterheadSettings } from "@/components/admin/OrgLetterheadSettings";
import { SchoolAppropriationSettings } from "@/components/admin/school/SchoolAppropriationSettings";
import { TenantList } from "@/components/tuition/TenantList";
import { useAuthMe } from "@/hooks/useAuthMe";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";

export default function AdminSettingsPage() {
  const { data: authMe } = useAuthMe();
  const { schoolScope } = useSchoolAdminApi();
  const isMaster = authMe?.admin?.role === "master";
  const isSchool = authMe?.admin?.organization?.institutionTier === "school";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        {isMaster ? (
          <p className="mt-2 max-w-lg text-sm text-slate-400">
            <strong className="font-medium text-slate-300">TON treasury wallet</strong> and checkout processing fee per
            school are configured in the{" "}
            <a href="/admin/master/organizations" className="text-cyan-300 underline hover:text-cyan-200">
              Manager console → Organizations
            </a>
            . Empty TON wallet uses <code className="font-mono text-slate-500">ODELHUB_TON_WALLET_ADDRESS</code> from env.
            <strong className="font-medium text-slate-300"> Checkout processing fee (UGX)</strong> uses the same screen.
          </p>
        ) : (
          <p className="mt-2 max-w-lg text-sm text-slate-400">
            Your school&apos;s TON wallet, FX rates, and checkout processing fee are configured by the ODEL HUB platform
            operator after workspace approval. Contact your platform master if you need changes. You can customize{" "}
            <a href="/admin/programmes" className="text-cyan-300 underline hover:text-cyan-200">
              programmes and fees
            </a>
            {isSchool ? (
              <>
                ,{" "}
                <Link href="/admin/school-structure" className="text-cyan-300 underline hover:text-cyan-200">
                  classes & streams
                </Link>
              </>
            ) : null}
            , admission number format, receipt letterhead, and your school favicon below.
          </p>
        )}
        <TuitionHubCheckoutExplainer className="mt-6 max-w-2xl" />
        {isMaster ? (
          <TenantList
            className="mt-8 max-w-2xl"
            title="Active schools (pay checkout)"
            description="Open tuition pay for any tenant."
          />
        ) : null}
      </div>

      {!isMaster ? (
        <>
          <AdmissionFormatSettings />
          <OrgLetterheadSettings />
          <OrgFaviconSettings />
        </>
      ) : null}

      {schoolScope ? <SchoolAppropriationSettings /> : null}

      <p className="text-sm text-slate-400">
        Account details and password are on{" "}
        <Link href="/admin/profile" className="text-cyan-300 underline hover:text-cyan-200">
          Profile
        </Link>
        .
      </p>
    </div>
  );
}
