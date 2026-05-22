/**
 * URA quiz pool used by Admin -> "Load question pool".
 * Exactly 500 questions, 4 options each, one correct answer.
 * Allowed branches only:
 * - General
 * - URA & compliance
 * - Tax basics
 * - Technical
 * - NFTs
 * - Security
 */

export interface BlockchainQuizItem {
  questionText: string;
  options: string[];
  correctIndex: number;
  branchName: string;
  points?: number;
}

const QUESTION_POINTS = 1000;
const TARGET_COUNT = 500;
const BRANCHES = ['General', 'URA & compliance', 'Tax basics', 'Technical', 'NFTs', 'Security'] as const;

type BranchName = (typeof BRANCHES)[number];
type Stem = { prompt: string; options: [string, string, string, string]; correctIndex: number };

const GENERAL_STEMS: Stem[] = [
  { prompt: 'What is the main purpose of a tax authority in a country?', options: ['To run private banks', 'To collect revenue for public services and enforce tax law', 'To set mobile data prices', 'To issue visas only'], correctIndex: 1 },
  { prompt: 'Why do governments require businesses to keep transaction records?', options: ['For social media posting', 'For tax assessment, audit trail, and compliance checks', 'To increase internet speed', 'To replace invoices'], correctIndex: 1 },
  { prompt: 'What does compliance usually mean in public finance?', options: ['Ignoring deadlines', 'Following legal, reporting, and payment requirements', 'Paying only when asked', 'Avoiding documentation'], correctIndex: 1 },
  { prompt: 'Which practice best supports transparent tax reporting?', options: ['Cash-only undocumented sales', 'Accurate books reconciled with source documents', 'Editing reports after filing', 'Using multiple hidden ledgers'], correctIndex: 1 },
  { prompt: 'What is the safest way to resolve uncertainty about a tax obligation?', options: ['Wait for penalties', 'Use official guidance or contact URA channels', 'Copy social media advice only', 'Ignore notices'], correctIndex: 1 },
  { prompt: 'What is an audit trail?', options: ['A hiking route', 'A chain of source records showing how figures were produced', 'A marketing plan', 'A bank overdraft'], correctIndex: 1 },
  { prompt: 'Which behavior reduces compliance risk for individuals and SMEs?', options: ['Late filing every period', 'Timely filing, timely payment, and proper records', 'Filing without reviewing data', 'Deleting receipts monthly'], correctIndex: 1 },
  { prompt: 'Why is taxpayer education important?', options: ['It replaces all laws', 'It helps taxpayers understand rights, duties, and processes', 'It cancels audits', 'It removes all taxes'], correctIndex: 1 },
  { prompt: 'What is one impact of tax evasion on the economy?', options: ['Better public hospitals', 'Reduced public revenue and unfair competition', 'Lower need for roads', 'Automatic debt cancellation'], correctIndex: 1 },
  { prompt: 'What does "file even when nil" usually imply?', options: ['Skip all returns', 'Submit required returns even with no payable amount', 'Pay estimated tax without filing', 'Close the TIN'], correctIndex: 1 },
];

const URA_COMPLIANCE_STEMS: Stem[] = [
  { prompt: 'What should a taxpayer do first after receiving an official URA notice?', options: ['Ignore it for 30 days', 'Read details, verify reference, and respond through official channels', 'Post it online only', 'Delete the message'], correctIndex: 1 },
  { prompt: 'Which channel is most appropriate for submitting compliance documents?', options: ['Unofficial chat groups', 'URA e-services/approved URA offices', 'Random file-sharing sites', 'Personal blogs'], correctIndex: 1 },
  { prompt: 'What is the best response to a potential discrepancy flagged by URA?', options: ['Hide records', 'Reconcile records and provide supporting evidence promptly', 'Stop trading immediately', 'Backdate all invoices'], correctIndex: 1 },
  { prompt: 'How can a business demonstrate VAT compliance during review?', options: ['Only verbal explanations', 'Valid invoices, returns, and reconciled sales/purchase records', 'Screenshots from social media', 'Unsigned spreadsheets only'], correctIndex: 1 },
  { prompt: 'What should be done when a filing error is discovered after submission?', options: ['Ignore permanently', 'Use available correction/amendment process quickly', 'Submit a different tax type', 'Close business profile'], correctIndex: 1 },
  { prompt: 'Which action improves readiness for URA compliance checks?', options: ['Storing records in many personal phones', 'Maintaining complete, organized, and retrievable records', 'Using no invoice numbers', 'Removing old records monthly'], correctIndex: 1 },
  { prompt: 'What is a key reason to use official URA payment references?', options: ['Faster internet', 'Correct allocation and traceability of tax payments', 'Automatic tax exemption', 'Higher sales conversion'], correctIndex: 1 },
  { prompt: 'What does voluntary disclosure generally support?', options: ['Automatic immunity for all cases', 'Early correction and better compliance outcomes', 'Skipping all filings', 'Deleting previous returns'], correctIndex: 1 },
  { prompt: 'Why should businesses separate personal and business transactions?', options: ['For social ranking', 'To improve accuracy and compliance evidence', 'To avoid bookkeeping', 'To lower payroll only'], correctIndex: 1 },
  { prompt: 'What is the safest way to verify URA guidance?', options: ['Forwarded messages only', 'Official URA publications, portals, and support desks', 'Anonymous comments', 'Unverified PDF copies'], correctIndex: 1 },
];

const TAX_BASICS_STEMS: Stem[] = [
  { prompt: 'What is taxable income in basic terms?', options: ['Any social media likes', 'Income subject to tax after applying relevant rules', 'Only foreign currency cash', 'Only mobile money deposits'], correctIndex: 1 },
  { prompt: 'What is withholding tax generally used for?', options: ['Replacing all taxes', 'Collecting part of tax at source on specific payments', 'Increasing bank fees', 'Issuing business licenses'], correctIndex: 1 },
  { prompt: 'What is VAT in simple terms?', options: ['A tax on land title transfers only', 'A consumption tax added at stages of supply', 'A payroll-only levy', 'A customs-only tariff'], correctIndex: 1 },
  { prompt: 'Why are due dates important in tax administration?', options: ['They are optional reminders', 'Late filing/payment may trigger penalties and interest', 'They reduce bookkeeping workload', 'They replace tax returns'], correctIndex: 1 },
  { prompt: 'What is the purpose of a Tax Identification Number (TIN)?', options: ['A marketing code', 'A unique taxpayer identifier for compliance and transactions', 'A bank PIN replacement', 'A vehicle plate number'], correctIndex: 1 },
  { prompt: 'What is a deductible expense (general concept)?', options: ['Any personal shopping', 'An allowable business expense under tax rules', 'Any cash withdrawal', 'Any donation without records'], correctIndex: 1 },
  { prompt: 'What does input VAT usually refer to?', options: ['VAT charged on your sales', 'VAT paid on eligible business purchases', 'Annual income tax', 'Customs storage fees'], correctIndex: 1 },
  { prompt: 'What does output VAT usually refer to?', options: ['VAT on purchases', 'VAT charged on taxable sales', 'Payroll tax', 'Property rates'], correctIndex: 1 },
  { prompt: 'What is a tax period?', options: ['Lifetime account cycle', 'Defined reporting interval for returns and payment', 'One business day only', 'A random date chosen yearly'], correctIndex: 1 },
  { prompt: 'What is the best first step before filing a return?', options: ['Guess values quickly', 'Reconcile books, source records, and tax computations', 'Copy last period blindly', 'Leave fields blank'], correctIndex: 1 },
];

const TECHNICAL_STEMS: Stem[] = [
  { prompt: 'What is the value of data validation in tax systems?', options: ['It slows all work only', 'It catches errors before filing and improves data integrity', 'It removes legal obligations', 'It replaces accounting records'], correctIndex: 1 },
  { prompt: 'Why is role-based access important in finance/tax software?', options: ['To give everyone admin rights', 'To restrict actions based on duties and reduce fraud risk', 'To avoid password use', 'To disable audit logs'], correctIndex: 1 },
  { prompt: 'What does API integration help with in compliance workflows?', options: ['Removing all controls', 'Automating secure data exchange between systems', 'Avoiding reconciliation forever', 'Printing only paper reports'], correctIndex: 1 },
  { prompt: 'What is the purpose of system audit logs?', options: ['Decorative dashboards', 'Traceability of who changed what and when', 'Automatic tax waivers', 'Network speed tests'], correctIndex: 1 },
  { prompt: 'Why use backups for financial/tax data?', options: ['To duplicate penalties', 'To ensure recovery from loss, error, or outage', 'To avoid user training', 'To bypass filing deadlines'], correctIndex: 1 },
  { prompt: 'What is a primary benefit of reconciliation scripts?', options: ['Creating random numbers', 'Comparing datasets to detect mismatches early', 'Deleting historical records', 'Hiding outstanding liabilities'], correctIndex: 1 },
  { prompt: 'What does encryption at rest protect against?', options: ['Late filing', 'Unauthorized reading of stored data', 'Invoice numbering errors', 'Incorrect VAT rates'], correctIndex: 1 },
  { prompt: 'Why is version control useful for compliance-related code/config?', options: ['It removes approvals', 'It provides history, review, and safer changes', 'It deletes evidence', 'It bypasses testing'], correctIndex: 1 },
  { prompt: 'What is a staging environment used for?', options: ['Live taxpayer updates directly', 'Testing changes safely before production release', 'Deleting old returns', 'Manual ledger balancing'], correctIndex: 1 },
  { prompt: 'What is the best way to handle production incidents in tax systems?', options: ['Silent fixes only', 'Incident response with logging, rollback plan, and postmortem', 'Disable alerts permanently', 'Ignore user reports'], correctIndex: 1 },
];

const NFTS_STEMS: Stem[] = [
  { prompt: 'What does NFT stand for?', options: ['Network Finance Token', 'Non-Fungible Token', 'New Filing Template', 'Native Fee Ticket'], correctIndex: 1 },
  { prompt: 'What is "non-fungible" in NFT context?', options: ['Interchangeable like cash', 'Unique and not directly interchangeable one-to-one', 'Tax-exempt by default', 'Always physical'], correctIndex: 1 },
  { prompt: 'What is minting an NFT?', options: ['Deleting a token', 'Creating and recording the token on-chain', 'Paying annual income tax', 'Converting VAT to PAYE'], correctIndex: 1 },
  { prompt: 'What is NFT metadata?', options: ['Payroll form', 'Descriptive data linked to the token (name, media, traits)', 'A tax rate table', 'A bank SWIFT code'], correctIndex: 1 },
  { prompt: 'What is a collection floor price?', options: ['Highest sale ever', 'Lowest current listing in the collection', 'Average annual return', 'Minting gas cap'], correctIndex: 1 },
  { prompt: 'What is royalty in NFT marketplaces?', options: ['Telecom levy', 'Creator percentage from secondary sales', 'Monthly server bill', 'A customs fee'], correctIndex: 1 },
  { prompt: 'Why verify NFT contract addresses before buying?', options: ['To increase gas fees', 'To reduce scam/copycat collection risk', 'To avoid wallet use', 'To skip marketplace checks'], correctIndex: 1 },
  { prompt: 'What is a burn in NFT systems?', options: ['Selling to highest bidder', 'Sending token to an unrecoverable address', 'Changing metadata locally only', 'Converting to fiat instantly'], correctIndex: 1 },
  { prompt: 'What is common storage for NFT media references?', options: ['Fax machines', 'Decentralized/file storage links (for example IPFS)', 'Payroll database only', 'SMS inbox'], correctIndex: 1 },
  { prompt: 'What is an NFT wallet approval risk?', options: ['No risk at all', 'Granting broad transfer permissions to malicious contracts', 'Making metadata larger', 'Reducing image quality'], correctIndex: 1 },
];

const SECURITY_STEMS: Stem[] = [
  { prompt: 'What should never be shared with anyone?', options: ['Public wallet address', 'Seed phrase/private key', 'Transaction hash', 'Token symbol'], correctIndex: 1 },
  { prompt: 'What is phishing?', options: ['A staking strategy', 'Fraud attempts to steal credentials via fake links/messages', 'A tax discount', 'A database backup method'], correctIndex: 1 },
  { prompt: 'Why enable MFA on important accounts?', options: ['To reduce login security', 'To add a second verification factor beyond password', 'To remove passwords completely', 'To skip account monitoring'], correctIndex: 1 },
  { prompt: 'What is least-privilege access?', options: ['Everyone gets admin', 'Users get only permissions needed for their role', 'No user accounts', 'Shared root password'], correctIndex: 1 },
  { prompt: 'How should suspicious URA/payment messages be handled?', options: ['Click first, verify later', 'Verify sender and links via official channels before action', 'Forward widely', 'Disable account alerts'], correctIndex: 1 },
  { prompt: 'What is the purpose of strong password policy?', options: ['Make sharing easy', 'Reduce brute-force and credential stuffing risk', 'Replace backups', 'Avoid user training'], correctIndex: 1 },
  { prompt: 'What is endpoint protection used for?', options: ['Color themes', 'Detecting and blocking malware/threat activity', 'Faster tax filing UI', 'Reducing invoice count'], correctIndex: 1 },
  { prompt: 'Why segment critical systems from general office networks?', options: ['To increase phishing traffic', 'To limit blast radius of breaches', 'To disable monitoring', 'To remove firewalls'], correctIndex: 1 },
  { prompt: 'What is secure incident reporting culture?', options: ['Hide mistakes', 'Report quickly, preserve evidence, coordinate response', 'Delete logs', 'Notify social media first'], correctIndex: 1 },
  { prompt: 'What does regular patching primarily reduce?', options: ['File sizes', 'Known vulnerability exposure', 'User count', 'Bank charges'], correctIndex: 1 },
];

const STEMS_BY_BRANCH: Record<BranchName, Stem[]> = {
  General: GENERAL_STEMS,
  'URA & compliance': URA_COMPLIANCE_STEMS,
  'Tax basics': TAX_BASICS_STEMS,
  Technical: TECHNICAL_STEMS,
  NFTs: NFTS_STEMS,
  Security: SECURITY_STEMS,
};

const CONTEXTS = [
  'for an SME filing monthly returns',
  'during year-end reconciliation',
  'when preparing records for audit',
  'while onboarding a new taxpayer account',
  'in a compliance training session',
  'for a finance officer reviewing transactions',
  'during e-service portal submission',
  'when validating taxpayer documents',
  'for internal controls review',
  'during data quality checks',
];

function buildBranchQuestions(branchName: BranchName, count: number): BlockchainQuizItem[] {
  const stems = STEMS_BY_BRANCH[branchName];
  const out: BlockchainQuizItem[] = [];
  for (let i = 0; i < count; i += 1) {
    const stem = stems[i % stems.length];
    const ctx = CONTEXTS[Math.floor(i / stems.length) % CONTEXTS.length];
    out.push({
      questionText: `[${branchName} #${i + 1}] ${stem.prompt} (${ctx})`,
      options: [...stem.options],
      correctIndex: stem.correctIndex,
      branchName,
      points: QUESTION_POINTS,
    });
  }
  return out;
}

const BRANCH_TARGETS: Record<BranchName, number> = {
  General: 84,
  'URA & compliance': 84,
  'Tax basics': 83,
  Technical: 83,
  NFTs: 83,
  Security: 83,
};

const generated = BRANCHES.flatMap((branch) => buildBranchQuestions(branch, BRANCH_TARGETS[branch]));

if (generated.length !== TARGET_COUNT) {
  throw new Error(`Quiz pool must contain exactly ${TARGET_COUNT} questions, got ${generated.length}`);
}

export const BLOCKCHAIN_QUIZ_QUESTIONS: BlockchainQuizItem[] = generated;
