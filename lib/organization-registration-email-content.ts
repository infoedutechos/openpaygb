/** Pure email HTML/text builders (no Prisma) — safe for fast unit tests. */

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatRegisteredAt(d: Date): string {
  try {
    return new Intl.DateTimeFormat("en-UG", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Africa/Kampala",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

export type WorkspaceRegistrationEmailDetails = {
  schoolName: string;
  slug: string;
  contactEmail: string;
  note: string;
  registeredAt: Date;
  /** When true, workspace activates automatically after email verify (no master approval). */
  autoRegistrationEnabled?: boolean;
};

export function buildWorkspaceRegistrationEmailHtml(
  details: WorkspaceRegistrationEmailDetails,
  verifyUrl: string,
): string {
  const noteBlock = details.note.trim()
    ? `<tr><td style="padding:6px 12px;color:#64748b;vertical-align:top">Notes</td><td style="padding:6px 12px;color:#0f172a">${escapeHtml(details.note.trim())}</td></tr>`
    : "";

  return `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;color:#0f172a;line-height:1.5">
<p style="font-size:12px;font-weight:600;letter-spacing:0.2em;color:#0891b2;text-transform:uppercase">ODEL HUB</p>
<h1 style="font-size:20px;font-weight:600;margin:0 0 12px">Confirm your school workspace request</h1>
<p>Thank you for registering with <strong>ODEL HUB Pay</strong>.</p>
<div style="margin:16px 0;padding:14px 16px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;font-size:13px">
  <p style="margin:0 0 8px;font-weight:600;color:#0c4a6e">About ODEL HUB</p>
  <ul style="margin:0;padding-left:18px;color:#334155">
    <li>Tuition and programme fee collection for schools</li>
    <li>Guest pay checkout (TON, mobile money where supported)</li>
    <li>School admin dashboard — students, payments, programmes, receipts, reports</li>
    <li>Platform master review and secure school staff sign-in</li>
  </ul>
</div>
<p>Please confirm your contact email using the button below. ${details.autoRegistrationEnabled ? "After confirmation your workspace is <strong>activated automatically</strong> (programmes and fees copied from the platform template). School admin login credentials are issued separately by the platform operator." : "After confirmation you will be redirected to track your workspace status. A platform master will review and approve your school workspace."}</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
  <tbody>
    <tr style="background:#f8fafc"><td style="padding:6px 12px;color:#64748b;width:38%">School / institution</td><td style="padding:6px 12px">${escapeHtml(details.schoolName)}</td></tr>
    <tr><td style="padding:6px 12px;color:#64748b">URL slug</td><td style="padding:6px 12px;font-family:ui-monospace,monospace">${escapeHtml(details.slug)}</td></tr>
    <tr style="background:#f8fafc"><td style="padding:6px 12px;color:#64748b">Contact email</td><td style="padding:6px 12px">${escapeHtml(details.contactEmail)}</td></tr>
    <tr><td style="padding:6px 12px;color:#64748b">Submitted</td><td style="padding:6px 12px">${escapeHtml(formatRegisteredAt(details.registeredAt))}</td></tr>
    ${noteBlock}
  </tbody>
</table>
<p><a href="${escapeHtml(verifyUrl)}" style="display:inline-block;background:linear-gradient(90deg,#06b6d4,#0284c7);color:#020617;font-weight:600;text-decoration:none;padding:12px 20px;border-radius:10px">Confirm email &amp; continue</a></p>
<p style="font-size:13px;color:#64748b">${details.autoRegistrationEnabled ? "After confirmation your workspace becomes active without waiting for master approval. Login credentials are issued separately by the platform operator." : "After confirmation a platform master will review your workspace. Login credentials are issued separately once approved."}</p>
<p style="font-size:12px;color:#94a3b8">This link expires in 72 hours. If you did not request a workspace, you can ignore this email.</p>
<p style="font-size:11px;color:#94a3b8;word-break:break-all">${escapeHtml(verifyUrl)}</p>
</div>`;
}

export function buildWorkspaceRegistrationEmailText(
  details: WorkspaceRegistrationEmailDetails,
  verifyUrl: string,
): string {
  const lines = [
    "ODEL HUB — Confirm your school workspace request",
    "",
    "Thank you for registering with ODEL HUB Pay.",
    "",
    "About ODEL HUB:",
    "- Tuition and programme fee collection for schools",
    "- Guest pay checkout (TON, mobile money where supported)",
    "- School admin dashboard — students, payments, programmes, receipts, reports",
    "- Platform master review and secure school staff sign-in",
    "",
    "Registration details:",
    `School: ${details.schoolName}`,
    `Slug: ${details.slug}`,
    `Contact: ${details.contactEmail}`,
    `Submitted: ${formatRegisteredAt(details.registeredAt)}`,
  ];
  if (details.note.trim()) lines.push(`Notes: ${details.note.trim()}`);
  lines.push(
    "",
    `Confirm your email: ${verifyUrl}`,
    "",
    details.autoRegistrationEnabled
      ? "After confirmation your workspace becomes active automatically. Login credentials are issued separately by the platform operator."
      : "After confirmation a platform master will review your workspace. Login credentials are issued separately once approved.",
    "",
    "This link expires in 72 hours.",
  );
  return lines.join("\n");
}
