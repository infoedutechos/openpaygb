export type PolicySection = {
  heading: string;
  paragraphs: string[];
};

export type PlatformPolicyDoc = {
  slug: string;
  title: string;
  summary: string;
  lastUpdated: string;
  sections: PolicySection[];
};

export const PLATFORM_TERMS: PlatformPolicyDoc = {
  slug: "terms",
  title: "Platform Terms of Service",
  summary: "Terms governing use of ODEL HUB, OdelPay, OpenPayGB, and Dex services.",
  lastUpdated: "June 2026",
  sections: [
    {
      heading: "1. Acceptance",
      paragraphs: [
        "By accessing or using ODEL HUB (including OdelPay tuition checkout, school admin tools, OpenPayGB wallet and card, Dex Hub, and developer APIs), you agree to these Platform Terms of Service and our Platform Privacy Policy. If you do not agree, do not use the platform.",
      ],
    },
    {
      heading: "2. Services",
      paragraphs: [
        "ODEL HUB is a multi-tenant payments and settlement platform. Institutions and schools operate separate workspaces; payers, students, and partners interact through published checkout flows, receipts, mobile-money and TON rails, OPGB ledger balances, and optional Dex liquidity tools.",
        "Features may change, be gated by master policy, or require separate institution approval. URAPearls / Clicker mini-app terms are separate — see /clicker/terms when using the Play Hub.",
      ],
    },
    {
      heading: "3. Accounts & eligibility",
      paragraphs: [
        "School admins, master operators, students, and developer integrators must provide accurate information and keep credentials confidential. You are responsible for activity under your account or API keys.",
        "Self-serve school workspace registration and developer app registration may require email verification and master approval before production checkout is enabled.",
      ],
    },
    {
      heading: "4. Payments & settlement",
      paragraphs: [
        "Quoted amounts, FX rates, platform fees, and settlement rails are shown at checkout. Confirmed payments produce receipts and ledger entries subject to PSP and on-chain confirmation times.",
        "OpenPayGB (OPGB) is an internal settlement unit (Phase 1: 1 OPGB = 1 UGX for bookkeeping). Crypto and Dex quotes are indicative until execution; see Risk Disclosure.",
      ],
    },
    {
      heading: "5. Acceptable use",
      paragraphs: [
        "You may not use ODEL HUB for fraud, money laundering, sanctions evasion, unauthorized access, or interference with platform operations. We may suspend workspaces, API keys, or accounts that violate these terms or applicable law.",
      ],
    },
    {
      heading: "6. Disclaimers & liability",
      paragraphs: [
        "The platform is provided \"as is\" and \"as available\". We do not guarantee uninterrupted service, error-free quotes, or suitability for every jurisdiction. To the extent permitted by law, our liability is limited to fees paid to us for the affected transaction in the prior twelve months.",
      ],
    },
    {
      heading: "7. Changes & contact",
      paragraphs: [
        "We may update these terms with notice via the platform or registered email. Continued use after the effective date constitutes acceptance.",
        "Questions: use the Help center (/help) or support contacts configured in Site UI settings.",
      ],
    },
  ],
};

export const PLATFORM_PRIVACY: PlatformPolicyDoc = {
  slug: "privacy",
  title: "Platform Privacy Policy",
  summary: "How ODEL HUB collects, uses, and protects personal and payment data.",
  lastUpdated: "June 2026",
  sections: [
    {
      heading: "1. Scope",
      paragraphs: [
        "This policy covers ODEL HUB platform services: tuition checkout, student portal, school admin, receipts, OpenPayGB card and wallet, Dex Hub, developer dashboard, and related APIs. The URAPearls Clicker app has a separate privacy notice at /clicker/privacy.",
      ],
    },
    {
      heading: "2. Data we collect",
      paragraphs: [
        "We collect information you provide (name, email, phone, programme selection, institution slug), payment metadata (amounts, rails, status, references), admin and developer credentials (hashed passwords, API key prefixes), and technical logs (IP, user agent, webhook delivery records).",
        "TON wallet addresses and transaction memos may be stored for payment matching. Telegram identifiers are used when you sign in via the bot or Mini App.",
      ],
    },
    {
      heading: "3. How we use data",
      paragraphs: [
        "To process payments and receipts, operate multi-tenant workspaces, prevent fraud, provide support, send transactional email (e.g. verification, receipts), and improve the knowledge base / copilot.",
        "Master admins may export operational data subject to backup and partner API policies.",
      ],
    },
    {
      heading: "4. Sharing",
      paragraphs: [
        "We share data with payment service providers (Mbiyo, LivePay, Relworx, VixonPay, TON network), hosting providers, and email delivery (e.g. Resend) only as needed to deliver the service. We do not sell personal data.",
        "Partner integrators with scoped API keys access only the data permitted by their key scope and organization binding.",
      ],
    },
    {
      heading: "5. Retention & security",
      paragraphs: [
        "Payment and receipt records are retained for accounting and dispute resolution. API secrets are stored hashed; plaintext keys are shown once at creation.",
        "We use HTTPS, access controls, and tenant isolation. No method of transmission over the Internet is 100% secure.",
      ],
    },
    {
      heading: "6. Your rights",
      paragraphs: [
        "Depending on your jurisdiction you may request access, correction, or deletion of personal data by contacting your institution admin or platform support. Some records must be retained for legal or audit reasons.",
      ],
    },
  ],
};

export const PLATFORM_RISK_DISCLOSURE: PlatformPolicyDoc = {
  slug: "risk-disclosure",
  title: "Risk Disclosure",
  summary: "Important risks when using payments, OPGB, crypto, and Dex features.",
  lastUpdated: "June 2026",
  sections: [
    {
      heading: "1. General",
      paragraphs: [
        "ODEL HUB facilitates tuition and wallet payments. You are responsible for verifying amounts, institution details, and receipt accuracy before and after payment.",
      ],
    },
    {
      heading: "2. Mobile money & bank rails",
      paragraphs: [
        "MoMo prompts depend on your handset, SIM, and PSP availability. Failed or reversed collections are governed by the provider's rules. Never share OTPs or approve unknown prompts.",
      ],
    },
    {
      heading: "3. TON & on-chain settlement",
      paragraphs: [
        "On-chain transfers are irreversible once confirmed. Wallet software, network congestion, and incorrect memos or amounts may cause delays or loss. Always confirm destination wallet and quoted TON amount on the pay screen.",
      ],
    },
    {
      heading: "4. OPGB, Dex & crypto",
      paragraphs: [
        "OPGB is a platform settlement ledger (Phase 1 peg: 1 OPGB = 1 UGX for internal accounting). Dex buy, sell, convert, AMM, and P2P features involve market, liquidity, and custody risks. Quotes are previews — slippage, fees, and FX may change before execution.",
        "Crypto assets are volatile. Custodial balances may be subject to maintenance windows, withdrawal queues, and regulatory constraints. Do not treat in-app balances as insured deposits unless explicitly stated.",
      ],
    },
    {
      heading: "5. Third-party apps",
      paragraphs: [
        "Developer-registered apps using Partner API or OAuth operate under their own branding. Review each integrator's terms before authorizing access to student or payment data.",
      ],
    },
  ],
};

export const PLATFORM_PAYMENT_PROVIDER_POLICY: PlatformPolicyDoc = {
  slug: "payment-providers",
  title: "Payment Provider Policy",
  summary: "How ODEL HUB selects, configures, and presents third-party payment rails.",
  lastUpdated: "June 2026",
  sections: [
    {
      heading: "1. Overview",
      paragraphs: [
        "ODEL HUB routes collections and disbursements through licensed or contracted payment service providers (PSPs). The platform operator enables or disables rails per Master Admin policy. Institutions do not directly hold PSP credentials unless documented for a dedicated integration.",
      ],
    },
    {
      heading: "2. Provider selection",
      paragraphs: [
        "Rails are chosen based on geography (e.g. Uganda UGX), institution tier, checkout context (guest tuition vs card top-up), and operational readiness (webhook health, env configuration). Master Admin may turn off a provider globally without notice during incidents.",
      ],
    },
    {
      heading: "3. Checkout presentation",
      paragraphs: [
        "Checkout displays the brand label configured for each rail (e.g. OpenPayGB via LivePay, Mbiyo, Relworx, VixonPay). TON Connect and OpenPayGB card use platform-operated ledgers with separate confirmation flows.",
      ],
    },
    {
      heading: "4. Webhooks & reconciliation",
      paragraphs: [
        "PSP webhooks are verified with shared secrets. Confirmed payments update student balances and receipts; partners may receive signed outbound webhooks. Always reconcile against PSP dashboards for production finance posting.",
      ],
    },
    {
      heading: "5. Supported providers",
      paragraphs: [
        "The catalog below reflects integrations in this deployment. Availability at checkout depends on master policy and environment configuration.",
      ],
    },
  ],
};

export const PLATFORM_POLICIES: Record<string, PlatformPolicyDoc> = {
  terms: PLATFORM_TERMS,
  privacy: PLATFORM_PRIVACY,
  "risk-disclosure": PLATFORM_RISK_DISCLOSURE,
  "payment-providers": PLATFORM_PAYMENT_PROVIDER_POLICY,
};
