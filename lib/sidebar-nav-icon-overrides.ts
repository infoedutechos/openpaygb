import { isSidebarIconId, SIDEBAR_ICON_IDS, SIDEBAR_ICON_LABELS } from "@/components/nav/sidebar-nav-icons";

type NavKeyDef = { navKey: string; label: string; defaultIconId: string; group: string };

/** Stable nav keys editable in Master Admin Console (no omissions across portals). */
export const MAC_SIDEBAR_NAV_KEYS: NavKeyDef[] = [
  // School ERP
  { group: "School ERP", navKey: "school.school-dashboard", label: "Dashboard", defaultIconId: "dashboard" },
  { group: "School ERP", navKey: "school.profile", label: "Profile", defaultIconId: "profile" },
  { group: "School ERP", navKey: "school.my-card", label: "My OpenPayGB Card", defaultIconId: "card" },
  { group: "School ERP", navKey: "school.school-session", label: "Session", defaultIconId: "session" },
  { group: "School ERP", navKey: "school.school-terms", label: "Set Terms", defaultIconId: "terms" },
  { group: "School ERP", navKey: "school.school-advertise", label: "Advertise", defaultIconId: "advertise" },
  { group: "School ERP", navKey: "school.school-accounts", label: "Accounts", defaultIconId: "accounts" },
  { group: "School ERP", navKey: "school.school-structure", label: "Class registration", defaultIconId: "structure" },
  { group: "School ERP", navKey: "school.programmes", label: "Fee programmes", defaultIconId: "programmes" },
  { group: "School ERP", navKey: "school.students", label: "Students / bills", defaultIconId: "students" },
  { group: "School ERP", navKey: "school.students-register", label: "Students Register", defaultIconId: "register" },
  { group: "School ERP", navKey: "school.fee-ledger", label: "Fee ledger", defaultIconId: "ledger" },
  { group: "School ERP", navKey: "school.fee-structure", label: "Fee structure", defaultIconId: "fees" },
  { group: "School ERP", navKey: "school.school-golive", label: "Go-live", defaultIconId: "golive" },
  { group: "School ERP", navKey: "school.defaulters", label: "Defaulters", defaultIconId: "defaulters" },
  { group: "School ERP", navKey: "school.school-cashbook", label: "Cashbook", defaultIconId: "cashbook" },
  { group: "School ERP", navKey: "school.school-attendance", label: "Attendance", defaultIconId: "attendance" },
  { group: "School ERP", navKey: "school.school-quran", label: "Qur'an progress", defaultIconId: "quran" },
  { group: "School ERP", navKey: "school.school-exams", label: "Examinations", defaultIconId: "exams" },
  { group: "School ERP", navKey: "school.school-audit", label: "Audit log", defaultIconId: "audit" },
  { group: "School ERP", navKey: "school.receipts", label: "Receipt of payments", defaultIconId: "receipts" },
  { group: "School ERP", navKey: "school.payment-requests", label: "Payment requests", defaultIconId: "requests" },
  { group: "School ERP", navKey: "school.virtual-cards", label: "OpenPayGB Cards", defaultIconId: "cards" },
  { group: "School ERP", navKey: "school.school-staff", label: "Staff", defaultIconId: "staff" },
  { group: "School ERP", navKey: "school.school-outflow", label: "Outflow", defaultIconId: "outflow" },
  { group: "School ERP", navKey: "school.school-settlement", label: "OPGB settlement", defaultIconId: "settlement" },
  { group: "School ERP", navKey: "school.school-inventory", label: "Inventory", defaultIconId: "inventory" },
  { group: "School ERP", navKey: "school.school-reports", label: "Reports", defaultIconId: "reports" },
  { group: "School ERP", navKey: "school.payments", label: "Online payments", defaultIconId: "payments" },
  { group: "School ERP", navKey: "school.users", label: "Users", defaultIconId: "users" },
  { group: "School ERP", navKey: "school.settings", label: "Settings", defaultIconId: "settings" },

  // University / higher-ed admin
  { group: "University admin", navKey: "uni.dashboard", label: "Dashboard", defaultIconId: "dashboard" },
  { group: "University admin", navKey: "uni.profile", label: "Profile", defaultIconId: "profile" },
  { group: "University admin", navKey: "uni.my-card", label: "My OpenPayGB Card", defaultIconId: "card" },
  { group: "University admin", navKey: "uni.tuition-balance", label: "Tuition balance", defaultIconId: "balance" },
  { group: "University admin", navKey: "uni.students", label: "Students", defaultIconId: "students" },
  { group: "University admin", navKey: "uni.school-structure", label: "Classes & streams", defaultIconId: "structure" },
  { group: "University admin", navKey: "uni.payments", label: "Payments", defaultIconId: "payments" },
  { group: "University admin", navKey: "uni.payment-requests", label: "Payment requests", defaultIconId: "requests" },
  { group: "University admin", navKey: "uni.virtual-cards", label: "OpenPayGB Cards", defaultIconId: "cards" },
  { group: "University admin", navKey: "uni.school-staff", label: "Staff", defaultIconId: "staff" },
  { group: "University admin", navKey: "uni.programmes", label: "Programs", defaultIconId: "programmes" },
  { group: "University admin", navKey: "uni.receipts", label: "Receipts", defaultIconId: "receipts" },
  { group: "University admin", navKey: "uni.reports", label: "Reports", defaultIconId: "reports" },
  { group: "University admin", navKey: "uni.users", label: "Users", defaultIconId: "users" },
  { group: "University admin", navKey: "uni.settings", label: "Settings", defaultIconId: "settings" },

  // Student
  { group: "Student", navKey: "student.dashboard", label: "Dashboard", defaultIconId: "dashboard" },
  { group: "Student", navKey: "student.profile", label: "Profile", defaultIconId: "profile" },
  { group: "Student", navKey: "student.balance", label: "Tuition balance", defaultIconId: "balance" },
  { group: "Student", navKey: "student.receipts", label: "Receipts & history", defaultIconId: "receipts" },
  { group: "Student", navKey: "student.pay", label: "Pay tuition", defaultIconId: "pay" },
  { group: "Student", navKey: "student.card", label: "OpenPayGB Card", defaultIconId: "card" },
  { group: "Student", navKey: "student.advertise", label: "Advertise", defaultIconId: "advertise" },
  { group: "Student", navKey: "student.home", label: "Student home", defaultIconId: "home" },
  { group: "Student", navKey: "student.lobby", label: "Lobby", defaultIconId: "lobby" },

  // Staff
  { group: "Staff", navKey: "staff.dashboard", label: "Dashboard", defaultIconId: "dashboard" },
  { group: "Staff", navKey: "staff.profile", label: "My profile", defaultIconId: "profile" },
  { group: "Staff", navKey: "staff.card", label: "OpenPayGB Card", defaultIconId: "card" },
  { group: "Staff", navKey: "staff.salary", label: "Salary history", defaultIconId: "salary" },
  { group: "Staff", navKey: "staff.advertise", label: "Advertise", defaultIconId: "advertise" },
  { group: "Staff", navKey: "staff.lobby", label: "Lobby", defaultIconId: "lobby" },

  // Master Admin Console
  { group: "Master", navKey: "mac.overview", label: "Overview", defaultIconId: "dashboard" },
  { group: "Master", navKey: "mac.organizations", label: "Organizations", defaultIconId: "orgs" },
  { group: "Master", navKey: "mac.programmes", label: "Programmes", defaultIconId: "programmes" },
  { group: "Master", navKey: "mac.tuition-balance", label: "Tuition balance", defaultIconId: "balance" },
  { group: "Master", navKey: "mac.opgb-ops", label: "OPGB console", defaultIconId: "settlement" },
  { group: "Master", navKey: "mac.project-download", label: "Docs & downloads", defaultIconId: "docs" },
  { group: "Master", navKey: "mac.my-card", label: "My OpenPayGB Card", defaultIconId: "card" },
  { group: "Master", navKey: "mac.virtual-cards", label: "OpenPayGB Cards", defaultIconId: "cards" },
  { group: "Master", navKey: "mac.openpay-cards-overview", label: "Cards (platform)", defaultIconId: "cards" },
  { group: "Master", navKey: "mac.platform-communications", label: "Chat & notifications", defaultIconId: "chat" },
  { group: "Master", navKey: "mac.ads-console", label: "Ads platform", defaultIconId: "ads" },
  { group: "Master", navKey: "mac.knowledge-base", label: "Knowledge base", defaultIconId: "knowledge" },
  { group: "Master", navKey: "mac.platform-social", label: "Social & share", defaultIconId: "social" },
  { group: "Master", navKey: "mac.system-backup", label: "Backup", defaultIconId: "backup" },
  { group: "Master", navKey: "mac.deployment-environment", label: "Environment", defaultIconId: "env" },
  { group: "Master", navKey: "mac.demo-logins", label: "Demo logins", defaultIconId: "demo" },
  { group: "Master", navKey: "mac.visitor-analytics", label: "Visitors", defaultIconId: "visitors" },
  { group: "Master", navKey: "mac.platform-branding", label: "Branding", defaultIconId: "branding" },
  { group: "Master", navKey: "mac.sidebar-nav-icons", label: "Sidebar icons", defaultIconId: "branding" },
  { group: "Master", navKey: "mac.auth-session-policy", label: "Auth policy", defaultIconId: "auth" },
  { group: "Master", navKey: "mac.cron-ops", label: "Cron ops", defaultIconId: "cron" },
  { group: "Master", navKey: "mac.ug-momo-credentials", label: "UG MoMo keys", defaultIconId: "momo" },
  { group: "Master", navKey: "mac.card-network", label: "Card network", defaultIconId: "network" },
  { group: "Master", navKey: "mac.payment-providers", label: "Payment providers", defaultIconId: "providers" },
  { group: "Master", navKey: "mac.mobile-money-providers", label: "Mobile money", defaultIconId: "momo" },
  { group: "Master", navKey: "mac.partner-integrations", label: "Partner API", defaultIconId: "partner" },
  { group: "Master", navKey: "mac.docs", label: "Documentation", defaultIconId: "docs" },
  { group: "Master", navKey: "mac.user-guides", label: "User guides", defaultIconId: "guides" },

  // Developers
  { group: "Developers", navKey: "dev.hub", label: "Developer hub", defaultIconId: "dev" },
  { group: "Developers", navKey: "dev.register", label: "Register / sign in", defaultIconId: "auth" },
  { group: "Developers", navKey: "dev.dashboard", label: "API dashboard", defaultIconId: "dashboard" },
  { group: "Developers", navKey: "dev.api-keys", label: "Generated API keys", defaultIconId: "api" },
  { group: "Developers", navKey: "dev.opgb-card", label: "OPGB Card", defaultIconId: "card" },
  { group: "Developers", navKey: "dev.woocommerce", label: "WooCommerce", defaultIconId: "woo" },
  { group: "Developers", navKey: "dev.woocommerce-plugin", label: "WooCommerce plugin", defaultIconId: "woo" },
  { group: "Developers", navKey: "dev.opgb", label: "OpenPayGB provider", defaultIconId: "shield" },
  { group: "Developers", navKey: "dev.integrate", label: "Integration guide", defaultIconId: "docs" },
  { group: "Developers", navKey: "dev.advertise", label: "Advertise (ads API)", defaultIconId: "advertise" },
  { group: "Developers", navKey: "dev.partner-docs", label: "Partner API docs", defaultIconId: "partner" },
  { group: "Developers", navKey: "dev.integrator", label: "Integrator guide", defaultIconId: "guides" },
  { group: "Developers", navKey: "dev.guides", label: "All user guides", defaultIconId: "guides" },
  { group: "Developers", navKey: "dev.help", label: "Help center", defaultIconId: "knowledge" },
  { group: "Developers", navKey: "dev.dashboard__overview", label: "Overview (dashboard)", defaultIconId: "dashboard" },
  { group: "Developers", navKey: "dev.dashboard__settlement", label: "Settlement & cashout", defaultIconId: "settlement" },
  { group: "Developers", navKey: "dev.dashboard__transactions", label: "Transactions", defaultIconId: "ledger" },
  { group: "Developers", navKey: "dev.dashboard__fees", label: "Fees", defaultIconId: "fees" },
  { group: "Developers", navKey: "dev.dashboard__branding", label: "White-label", defaultIconId: "branding" },
  { group: "Developers", navKey: "dev.dashboard__webhooks", label: "Webhooks", defaultIconId: "network" },
  { group: "Developers", navKey: "dev.dashboard__oauth", label: "OAuth & OPGB APIs", defaultIconId: "auth" },
  { group: "Developers", navKey: "dev.woo-download", label: "Download · odelhub-openpaygb", defaultIconId: "backup" },
  { group: "Developers", navKey: "dev.charges", label: "Create a charge", defaultIconId: "pay" },
  { group: "Developers", navKey: "dev.charge-webhooks", label: "Charge webhooks", defaultIconId: "network" },
  { group: "Developers", navKey: "dev.checkout", label: "Hosted checkout", defaultIconId: "payments" },

  // Shared
  { group: "Shared", navKey: "shared.dex", label: "Dex Hub", defaultIconId: "dex" },
];

export function parseSidebarNavIconOverrides(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof k !== "string" || !k.trim()) continue;
    if (typeof v === "string" && isSidebarIconId(v)) out[k.trim()] = v;
  }
  return out;
}

export { SIDEBAR_ICON_IDS, SIDEBAR_ICON_LABELS, isSidebarIconId };
