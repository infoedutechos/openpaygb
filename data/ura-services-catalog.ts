/**
 * URA Services hub — top-level sidebar buckets; each opens a full grid of links.
 */

export type UraServiceItem = {
  id: string;
  title: string;
  description: string;
  url: string;
  /** Emoji tile — matches the service at a glance */
  serviceIcon: string;
  inApp?: 'tax-calculator';
  /** Subheading in the main list (same label = same group) */
  listSection?: string;
};

export type ServiceGroupId =
  | 'domestic'
  | 'import-export'
  | 'single-window'
  | 'legal-policy'
  | 'opportunities'
  | 'research'
  | 'useful-links';

export type UraServiceCategory = {
  id: string;
  groupId: ServiceGroupId;
  shortLabel: string;
  title: string;
  /** Shown under the title in the main panel when this category is selected */
  listIntro?: string;
  sidebarIcon: string;
  services: UraServiceItem[];
};

export const GROUP_THEME: Record<
  ServiceGroupId,
  {
    activeClass: string;
    activeIconClass: string;
    idleIconClass: string;
    accentClass: string;
  }
> = {
  domestic: {
    activeClass: 'bg-sky-500/25 border-sky-400/60 shadow-[0_0_14px_rgba(56,189,248,0.22)]',
    activeIconClass: 'text-sky-200',
    idleIconClass: 'text-slate-600',
    accentClass: 'text-sky-300',
  },
  'import-export': {
    activeClass: 'bg-teal-500/20 border-teal-400/55 shadow-[0_0_14px_rgba(45,212,191,0.2)]',
    activeIconClass: 'text-teal-200',
    idleIconClass: 'text-slate-600',
    accentClass: 'text-teal-300',
  },
  'single-window': {
    activeClass: 'bg-emerald-500/22 border-emerald-400/55 shadow-[0_0_14px_rgba(52,211,153,0.2)]',
    activeIconClass: 'text-emerald-200',
    idleIconClass: 'text-slate-600',
    accentClass: 'text-emerald-300',
  },
  'legal-policy': {
    activeClass: 'bg-rose-500/20 border-rose-400/50 shadow-[0_0_14px_rgba(251,113,133,0.18)]',
    activeIconClass: 'text-rose-200',
    idleIconClass: 'text-slate-600',
    accentClass: 'text-rose-300',
  },
  opportunities: {
    activeClass: 'bg-amber-500/22 border-amber-400/55 shadow-[0_0_14px_rgba(245,158,11,0.2)]',
    activeIconClass: 'text-amber-200',
    idleIconClass: 'text-slate-600',
    accentClass: 'text-amber-300',
  },
  research: {
    activeClass: 'bg-indigo-500/25 border-indigo-400/55 shadow-[0_0_14px_rgba(129,140,248,0.22)]',
    activeIconClass: 'text-indigo-200',
    idleIconClass: 'text-slate-600',
    accentClass: 'text-indigo-300',
  },
  'useful-links': {
    activeClass: 'bg-cyan-500/20 border-cyan-400/55 shadow-[0_0_14px_rgba(34,211,238,0.18)]',
    activeIconClass: 'text-cyan-200',
    idleIconClass: 'text-slate-600',
    accentClass: 'text-cyan-300',
  },
};

export const URA_SERVICE_CATEGORIES: UraServiceCategory[] = [
  {
    id: 'domestic',
    groupId: 'domestic',
    shortLabel: 'Domestic',
    title: 'Domestic taxes & taxpayer services',
    listIntro: 'TIN, eTax, returns, EFRIS, payments, and domestic compliance — grouped by topic.',
    sidebarIcon: '🧾',
    services: [
      {
        id: 'tax-calculator',
        title: 'Tax calculator',
        description: 'Estimate VAT at 18% (standard rated) in UGX.',
        url: 'https://ura.go.ug/en/domestic-taxes/',
        serviceIcon: '🧮',
        inApp: 'tax-calculator',
        listSection: 'Registration & e-services',
      },
      { id: 'tin-apply', title: 'Get a TIN', description: 'Registration for individuals & businesses.', url: 'https://ura.go.ug/en/domestic-taxes/tin-application/', serviceIcon: '🪪', listSection: 'Registration & e-services' },
      { id: 'etax-login', title: 'eTax portal', description: 'Log in with TIN — returns, payments, services.', url: 'https://ura.go.ug/en/etax-login/', serviceIcon: '💻', listSection: 'Registration & e-services' },
      { id: 'domestic-hub', title: 'Domestic taxes overview', description: 'All domestic tax types.', url: 'https://ura.go.ug/en/domestic-taxes/', serviceIcon: '🏢', listSection: 'Registration & e-services' },
      { id: 'clearance', title: 'Tax clearance certificate', description: 'Compliance for tenders & business.', url: 'https://ura.go.ug/en/domestic-taxes/', serviceIcon: '✅', listSection: 'Registration & e-services' },
      { id: 'efris', title: 'EFRIS hub', description: 'E-invoicing & fiscal receipting.', url: 'https://ura.go.ug/en/efris/', serviceIcon: '📤', listSection: 'EFRIS' },
      { id: 'efris-reg', title: 'EFRIS registration', description: 'First-time setup & OTP.', url: 'https://ura.go.ug/en/efris/efris-registration/', serviceIcon: '✍️', listSection: 'EFRIS' },
      { id: 'efris-login', title: 'EFRIS login', description: 'Portal & desktop client.', url: 'https://ura.go.ug/en/efris/efris-login/', serviceIcon: '🔐', listSection: 'EFRIS' },
      { id: 'efris-handbook', title: 'EFRIS handbook', description: 'Operational reference.', url: 'https://ura.go.ug/en/efris-handbook/', serviceIcon: '📖', listSection: 'EFRIS' },
      { id: 'e-returns', title: 'File e-returns', description: 'Online return filing.', url: 'https://ura.go.ug/en/domestic-taxes/', serviceIcon: '📄', listSection: 'Returns & disputes' },
      { id: 'vat-returns', title: 'VAT returns', description: 'Periodic VAT compliance.', url: 'https://ura.go.ug/en/domestic-taxes/', serviceIcon: '🧾', listSection: 'Returns & disputes' },
      { id: 'income-tax-ret', title: 'Income tax returns', description: 'Corporate & individual filing.', url: 'https://ura.go.ug/en/domestic-taxes/', serviceIcon: '📑', listSection: 'Returns & disputes' },
      { id: 'objections', title: 'Objections & appeals', description: 'Disputes and appellate routes.', url: 'https://ura.go.ug/en/domestic-taxes/', serviceIcon: '⚖️', listSection: 'Returns & disputes' },
      { id: 'tax-appeals-act', title: 'Tax Appeals Tribunals Act', description: 'Legal framework (downloads).', url: 'https://ura.go.ug/download-category/laws-and-acts/', serviceIcon: '📜', listSection: 'Returns & disputes' },
      { id: 'case-digest-dom', title: 'Case digests', description: 'Summaries & policy notes.', url: 'https://ura.go.ug/download-category/legal-and-policy/', serviceIcon: '📚', listSection: 'Returns & disputes' },
      { id: 'incentives', title: 'Tax incentives & exemptions', description: 'Investment incentives framework.', url: 'https://ura.go.ug/en/domestic-taxes/tax-exemption/', serviceIcon: '🎁', listSection: 'Incentives & withholding' },
      { id: 'wht-agents', title: 'Designated WHT agents', description: 'Published lists (e.g. FY designations).', url: 'https://ura.go.ug/en/domestic-taxes/tax-exemption/designated-income-tax-wht-agents-for-fy-2024-25/', serviceIcon: '📋', listSection: 'Incentives & withholding' },
      { id: 'dts-portal', title: 'DTS portal', description: 'Digital tracking (eligible cargo).', url: 'https://dts.go.ug/', serviceIcon: '📡', listSection: 'DTS & trade data' },
      { id: 'dts-info', title: 'DTS & customs context', description: 'Related clearance information.', url: 'https://ura.go.ug/en/customs/', serviceIcon: '🛰️', listSection: 'DTS & trade data' },
      { id: 'mv-ura', title: 'Motor vehicle (URA)', description: 'Search, registration & transfer.', url: 'https://ura.go.ug/en/domestic-taxes/motor-vehicle/', serviceIcon: '🚗', listSection: 'Motor & stamp duty' },
      { id: 'mv-calc', title: 'Motor vehicle calculator', description: 'Duty / tax estimation.', url: 'https://services.ura.go.ug/faces/mv_calculator.xhtml', serviceIcon: '🔢', listSection: 'Motor & stamp duty' },
      { id: 'mv-refund', title: 'MV / stamp / permit refunds', description: 'Refund process.', url: 'https://ura.go.ug/en/domestic-taxes/get-a-refund/motor-vehicle-or-stamp-duty/', serviceIcon: '↩️', listSection: 'Motor & stamp duty' },
      { id: 'stamp-act', title: 'Stamp duty (Acts)', description: 'Legislation & instruments.', url: 'https://ura.go.ug/download-category/laws-and-acts/', serviceIcon: '✉️', listSection: 'Motor & stamp duty' },
      { id: 'stamp-domestic', title: 'Stamp duty services', description: 'Domestic stamping guidance.', url: 'https://ura.go.ug/en/domestic-taxes/', serviceIcon: '📮', listSection: 'Motor & stamp duty' },
      { id: 'prn', title: 'Generate payment slip (PRN)', description: 'Payment registration.', url: 'https://ura.go.ug/en/domestic-taxes/make-a-payment/generate-a-payment-slip/', serviceIcon: '🎫', listSection: 'Payments & refunds' },
      { id: 'payment-hub', title: 'Make a payment', description: 'Banks & payment channels.', url: 'https://ura.go.ug/en/domestic-taxes/make-a-payment/', serviceIcon: '💳', listSection: 'Payments & refunds' },
      { id: 'refund-hub', title: 'Get a refund', description: 'Domestic tax refunds.', url: 'https://ura.go.ug/en/domestic-taxes/get-a-refund/', serviceIcon: '💸', listSection: 'Payments & refunds' },
      { id: 'tax-agent-reg', title: 'Tax agents registration', description: 'TARC registration & renewal.', url: 'https://ura.go.ug/en/tax-agents-registration/', serviceIcon: '👥', listSection: 'Tax agents' },
      { id: 'tax-agent-faq', title: 'Tax agent FAQ', description: 'Appointment & licensed agents.', url: 'https://ura.go.ug/en/dt-faqs/agents-services/', serviceIcon: '❓', listSection: 'Tax agents' },
      { id: 'tax-services', title: 'Tax services', description: 'Using agents on the portal.', url: 'https://ura.go.ug/en/tax-services/', serviceIcon: '🤝', listSection: 'Tax agents' },
    ],
  },
  {
    id: 'import-export',
    groupId: 'import-export',
    shortLabel: 'Trade',
    title: 'Import, export & customs',
    listIntro: 'Customs procedures, regional programmes, UESW context, and industry links.',
    sidebarIcon: '🛃',
    services: [
      { id: 'customs-home', title: 'Customs home', description: 'Import, export & transit.', url: 'https://ura.go.ug/en/customs/', serviceIcon: '🛃', listSection: 'Customs operations' },
      { id: 'export-proc', title: 'Export procedures', description: 'Documentation & rebates.', url: 'https://ura.go.ug/en/customs/', serviceIcon: '📤', listSection: 'Customs operations' },
      { id: 'valuation', title: 'Customs valuation', description: 'Transaction value & rules.', url: 'https://ura.go.ug/en/customs/', serviceIcon: '🔎', listSection: 'Customs operations' },
      { id: 'bonded', title: 'Warehousing & bonds', description: 'Bonded warehouses & suspense.', url: 'https://ura.go.ug/en/customs/', serviceIcon: '🏭', listSection: 'Customs operations' },
      { id: 'cust-audit', title: 'Customs audits', description: 'Post-clearance compliance.', url: 'https://ura.go.ug/en/customs/', serviceIcon: '🔍', listSection: 'Customs operations' },
      { id: 'cust-refund', title: 'Customs refunds', description: 'Drawback & refunds.', url: 'https://ura.go.ug/en/customs/', serviceIcon: '💵', listSection: 'Customs operations' },
      { id: 'enforcement', title: 'Customs enforcement', description: 'Compliance & seizures.', url: 'https://ura.go.ug/en/customs/', serviceIcon: '🚔', listSection: 'Customs operations' },
      { id: 'overstay-notice', title: 'Overstayed cargo notice', description: 'Clear overstayed goods.', url: 'https://ura.go.ug/en/clearance-removal-of-overstayed-motor-vehicles-at-mombasa-and-cargo-at-the-customs-warehouse/', serviceIcon: '⏱️', listSection: 'Customs operations' },
      { id: 'cet', title: 'Common External Tariff', description: 'Classification & schedules.', url: 'https://ura.go.ug/download-category/laws-and-acts/', serviceIcon: '📋', listSection: 'Tariffs & programmes' },
      { id: 'aeo-info', title: 'Authorized Economic Operator', description: 'Trusted trader programme.', url: 'https://ura.go.ug/en/customs/', serviceIcon: '⭐', listSection: 'Tariffs & programmes' },
      { id: 'sct', title: 'Single Customs Territory', description: 'EAC regional transit.', url: 'https://ura.go.ug/en/customs/', serviceIcon: '🌍', listSection: 'Tariffs & programmes' },
      { id: 'eaccma', title: 'EACCMA & duty remission', description: 'Legal texts & remissions.', url: 'https://ura.go.ug/download-category/laws-and-acts/', serviceIcon: '📑', listSection: 'Tariffs & programmes' },
      { id: 'public-auction', title: 'Public customs auction', description: 'Online auction information.', url: 'https://ura.go.ug/en/import-export/public-online-auction/', serviceIcon: '🔨', listSection: 'Tariffs & programmes' },
      { id: 'uesw-ura', title: 'Uganda Electronic Single Window', description: 'UESW overview (URA).', url: 'https://ura.go.ug/en/uesw/', serviceIcon: '🪟', listSection: 'UESW & clearing' },
      { id: 'uesw-faq', title: 'UESW FAQs', description: 'How to register and transact.', url: 'https://ura.go.ug/en/frequently-asked-questionsfaqs-on-the-uganda-electronic-single-windowuesw/', serviceIcon: '❔', listSection: 'UESW & clearing' },
      { id: 'clearing-agents', title: 'Clearing & forwarding', description: 'Licensed agents & UESW.', url: 'https://ura.go.ug/en/uesw/', serviceIcon: '🧑‍✈️', listSection: 'UESW & clearing' },
      { id: 'ucifa', title: 'UCIFA', description: 'Clearing & forwarding association.', url: 'https://www.ucifa.or.ug/', serviceIcon: '🚛', listSection: 'UESW & clearing' },
    ],
  },
  {
    id: 'single-window',
    groupId: 'single-window',
    shortLabel: 'Single Window',
    title: 'Uganda Electronic Single Window',
    listIntro: 'National trade portal — access, transactions, modules, and reports.',
    sidebarIcon: '🪟',
    services: [
      {
        id: 'uesw-portal-home',
        title: 'UESW home',
        description: 'Uganda Electronic Single Window — national trade portal.',
        url: 'https://www.singlewindow.go.ug/',
        serviceIcon: '🏠',
        listSection: 'Portal & access',
      },
      {
        id: 'uesw-stp',
        title: 'Single Trade Portal (STP)',
        description: 'Single Trade Portal entry — e-services and transactions.',
        url: 'https://www.singlewindow.go.ug/stp',
        serviceIcon: '📋',
        listSection: 'Portal & access',
      },
      {
        id: 'uesw-login',
        title: 'UESW login',
        description: 'Sign in to the UESW system.',
        url: 'https://www.singlewindow.go.ug/uesw/Login',
        serviceIcon: '🔐',
        listSection: 'Portal & access',
      },
      {
        id: 'uesw-auctions',
        title: 'Auctions',
        description: 'Portal auctions (as on the UESW site).',
        url: 'https://www.singlewindow.go.ug/auction/',
        serviceIcon: '🔨',
        listSection: 'E-services',
      },
      {
        id: 'uesw-tracking',
        title: 'Track approvals',
        description: 'Track application and approval status.',
        url: 'https://www.singlewindow.go.ug/uesw/Tracking',
        serviceIcon: '📍',
        listSection: 'E-services',
      },
      {
        id: 'uesw-downloads',
        title: 'Downloads',
        description: 'Forms, guides, and downloadable resources.',
        url: 'https://www.singlewindow.go.ug/uesw/Downloads',
        serviceIcon: '⬇️',
        listSection: 'E-services',
      },
      {
        id: 'uesw-licensing',
        title: 'Licensing',
        description: 'Licensing services on the Single Window.',
        url: 'https://www.singlewindow.go.ug/license/',
        serviceIcon: '📜',
        listSection: 'E-services',
      },
      {
        id: 'uesw-atransporter',
        title: 'aTransporter',
        description: 'Transporter module on the Single Window.',
        url: 'https://www.singlewindow.go.ug/atransporter/',
        serviceIcon: '🚚',
        listSection: 'E-services',
      },
      {
        id: 'uesw-eure',
        title: 'eURE',
        description: 'eURE service on the Single Window.',
        url: 'https://www.singlewindow.go.ug/eure',
        serviceIcon: '♻️',
        listSection: 'E-services',
      },
      {
        id: 'uesw-licensed-agents',
        title: 'Licensed agents',
        description: 'Directory / reporting for licensed agents.',
        url: 'https://www.singlewindow.go.ug/uesw/LicensedAgents',
        serviceIcon: '👥',
        listSection: 'Reports & directories',
      },
      {
        id: 'uesw-licensed-customs-report',
        title: 'Licensed customs agents report',
        description: 'Licensed customs agents report.',
        url: 'https://www.singlewindow.go.ug/uesw/LicensedCustomsAgentsReport',
        serviceIcon: '📊',
        listSection: 'Reports & directories',
      },
      {
        id: 'uesw-customs-reports',
        title: 'Customs reports',
        description: 'UESW customs reporting.',
        url: 'https://www.singlewindow.go.ug/uesw/CustomsReports',
        serviceIcon: '🛃',
        listSection: 'Reports & directories',
      },
      {
        id: 'uesw-mda-reports',
        title: 'MDA reports',
        description: 'Ministry / agency (MDA) reports.',
        url: 'https://www.singlewindow.go.ug/uesw/MDAReports',
        serviceIcon: '🏛️',
        listSection: 'Reports & directories',
      },
      {
        id: 'uesw-rects-reports',
        title: 'RECTS reports',
        description: 'RECTS reporting module.',
        url: 'https://www.singlewindow.go.ug/uesw/RECTSReports',
        serviceIcon: '📑',
        listSection: 'Reports & directories',
      },
    ],
  },
  {
    id: 'legal-policy',
    groupId: 'legal-policy',
    shortLabel: 'Legal',
    title: 'Legal & policy',
    listIntro: 'Acts, digests, international tax cooperation, and partner institutions.',
    sidebarIcon: '⚖️',
    services: [
      { id: 'laws-archive', title: 'Laws, Acts & regulations', description: 'Download tax & customs law.', url: 'https://ura.go.ug/download-category/laws-and-acts/', serviceIcon: '📚', listSection: 'Laws & library' },
      { id: 'legal-policy-cat', title: 'Legal & policy library', description: 'Digests, debt function & reports.', url: 'https://ura.go.ug/download-category/legal-and-policy/', serviceIcon: '📁', listSection: 'Laws & library' },
      { id: 'case-digest', title: 'Case summary reports', description: 'URA case digests & volumes.', url: 'https://ura.go.ug/download-category/legal-and-policy/', serviceIcon: '📒', listSection: 'Laws & library' },
      { id: 'east-africa-tax', title: 'East African Tax Law Report', description: 'Regional jurisprudence.', url: 'https://ura.go.ug/download-category/legal-and-policy/', serviceIcon: '🌐', listSection: 'Laws & library' },
      { id: 'debt-fn', title: 'Debt collections', description: 'Debt collection function publications.', url: 'https://ura.go.ug/download-category/legal-and-policy/', serviceIcon: '💼', listSection: 'Laws & library' },
      { id: 'aml-act', title: 'Anti-Money Laundering Act', description: 'Related legal downloads.', url: 'https://ura.go.ug/download-category/laws-and-acts/', serviceIcon: '🛡️', listSection: 'International & AML' },
      { id: 'dtaa', title: 'Double taxation agreements', description: 'Treaties & international tax.', url: 'https://ura.go.ug/en/domestic-taxes/', serviceIcon: '🤝', listSection: 'International & AML' },
      { id: 'mutual-assist', title: 'Mutual administrative assistance', description: 'International cooperation.', url: 'https://ura.go.ug/download-category/laws-and-acts/', serviceIcon: '🔗', listSection: 'International & AML' },
      { id: 'delegated', title: 'Delegated competent authority', description: 'Origin & certificates.', url: 'https://ura.go.ug/en/customs/', serviceIcon: '✒️', listSection: 'International & AML' },
      { id: 'rules-origin', title: 'Rules of origin', description: 'EAC instruments.', url: 'https://ura.go.ug/download-category/laws-and-acts/', serviceIcon: '🏷️', listSection: 'International & AML' },
      { id: 'fia-portal', title: 'Financial Intelligence Authority', description: 'National AML/CFT authority.', url: 'https://fia.go.ug/', serviceIcon: '🏦', listSection: 'Institutions' },
    ],
  },
  {
    id: 'opportunities',
    groupId: 'opportunities',
    shortLabel: 'Careers',
    title: 'Opportunities',
    listIntro: 'Careers, learning, tenders, and URA auctions.',
    sidebarIcon: '👔',
    services: [
      { id: 'careers-ura', title: 'Careers at URA', description: 'Jobs and recruitment.', url: 'https://ura.go.ug/en/opportunities/careers/', serviceIcon: '👔', listSection: 'Careers & learning' },
      { id: 'elearning-page', title: 'URA E-Learning', description: 'Courses for taxpayers & staff.', url: 'https://ura.go.ug/en/opportunities/e-learning-platform/', serviceIcon: '🎓', listSection: 'Careers & learning' },
      { id: 'elearning-lms', title: 'URA LMS (Moodle)', description: 'Direct learning platform.', url: 'https://elearning.ura.go.ug/', serviceIcon: '📱', listSection: 'Careers & learning' },
      { id: 'tenders-ura', title: 'Tenders', description: 'Procurement & suppliers.', url: 'https://ura.go.ug/en/opportunities/tenders/', serviceIcon: '📋', listSection: 'Tenders & auctions' },
      { id: 'auctions-ura', title: 'Auctions', description: 'Asset disposal & ADMS.', url: 'https://ura.go.ug/en/opportunities/auctions/', serviceIcon: '🔨', listSection: 'Tenders & auctions' },
      { id: 'auction-apply', title: 'Auction application', description: 'Bidding platform.', url: 'https://ura.go.ug/en/opportunities/auctions/auctioning-application/', serviceIcon: '💻', listSection: 'Tenders & auctions' },
      { id: 'auction-notice', title: 'Electronic auction notices', description: 'Disposal notices.', url: 'https://ura.go.ug/en/notice-for-disposal-of-assets-by-electronic-auctioning/', serviceIcon: '📣', listSection: 'Tenders & auctions' },
    ],
  },
  {
    id: 'research',
    groupId: 'research',
    shortLabel: 'Research',
    title: 'Research & publications',
    listIntro: 'Reports, statistics, strategy, and taxpayer education.',
    sidebarIcon: '📈',
    services: [
      { id: 'research-hub', title: 'Research & publications', description: 'Lab, plans, bulletins hub.', url: 'https://ura.go.ug/en/research-publications/', serviceIcon: '🔬', listSection: 'Publications' },
      { id: 'corp-plans', title: 'Corporate plans', description: 'Strategic corporate documents.', url: 'https://ura.go.ug/en/research-publications/', serviceIcon: '📊', listSection: 'Publications' },
      { id: 'bulletins', title: 'Research bulletins', description: 'Analytical briefs.', url: 'https://ura.go.ug/en/research-publications/', serviceIcon: '📰', listSection: 'Publications' },
      { id: 'rev-perf', title: 'Revenue performance reports', description: 'Collections reporting.', url: 'https://ura.go.ug/en/research-publications/', serviceIcon: '💹', listSection: 'Publications' },
      { id: 'stats', title: 'Statistics', description: 'Official revenue & trade stats.', url: 'https://ura.go.ug/en/research-publications/', serviceIcon: '📉', listSection: 'Publications' },
      { id: 'strategic', title: 'Strategic documents', description: 'Policy strategy papers.', url: 'https://ura.go.ug/en/research-publications/', serviceIcon: '🎯', listSection: 'Publications' },
      { id: 'trade-rep', title: 'Trade reports', description: 'Import/export analysis.', url: 'https://ura.go.ug/en/research-publications/', serviceIcon: '🚢', listSection: 'Publications' },
      { id: 'innovation', title: 'Innovations & digital', description: 'Modernization (eTax, UESW, EFRIS).', url: 'https://www.ura.go.ug/', serviceIcon: '💡', listSection: 'Programmes & education' },
      { id: 'reap', title: 'REAP / e-tax programme', description: 'Finance ministry programme.', url: 'https://reap.finance.go.ug/e-tax/', serviceIcon: '🏛️', listSection: 'Programmes & education' },
      { id: 'tax-education', title: 'Tax education', description: 'Public taxpayer learning.', url: 'https://ura.go.ug/en/tax-education/', serviceIcon: '📖', listSection: 'Programmes & education' },
    ],
  },
  {
    id: 'useful-links',
    groupId: 'useful-links',
    shortLabel: 'Links',
    title: 'Useful links',
    listIntro: 'Government, regional bodies, and URA entry points.',
    sidebarIcon: '🌐',
    services: [
      { id: 'mofped', title: 'Ministry of Finance (MoFPED)', description: 'National economic policy.', url: 'https://www.finance.go.ug/', serviceIcon: '🏛️', listSection: 'Government & region' },
      { id: 'eac', title: 'East African Community', description: 'Customs union & integration.', url: 'https://www.eac.int/', serviceIcon: '🌍', listSection: 'Government & region' },
      { id: 'uia', title: 'Uganda Investment Authority', description: 'Investment promotion.', url: 'https://www.uia.go.ug/', serviceIcon: '💼', listSection: 'Markets & industry' },
      { id: 'cma', title: 'Capital Markets Authority', description: 'Investor-facing regulator.', url: 'https://www.cmauganda.co.ug/', serviceIcon: '📈', listSection: 'Markets & industry' },
      { id: 'ucifa-link', title: 'UCIFA', description: 'Clearing industry association.', url: 'https://www.ucifa.or.ug/', serviceIcon: '🚚', listSection: 'Markets & industry' },
      { id: 'ura-contact', title: 'Contact URA', description: 'Offices & helpdesk.', url: 'https://www.ura.go.ug/en/contact-us/', serviceIcon: '📞', listSection: 'URA' },
      { id: 'ura-sitemap', title: 'URA website', description: 'Full site directory.', url: 'https://www.ura.go.ug/', serviceIcon: '🏠', listSection: 'URA' },
    ],
  },
];

export const URA_SERVICES_DEFAULT_CATEGORY_ID = URA_SERVICE_CATEGORIES[0]?.id ?? 'domestic';
