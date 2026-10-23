import { GroundTruthLabel, Invoice } from '@/types/invoice';
import { sanitizeCsvCell } from '@/lib/security';

export interface SyntheticInvoiceItem {
  invoice_id: string;
  vendor: string;
  invoice_date: string;
  amount: number;
  expected_amount?: number;
  po_number?: string;
  due_date?: string;
  currency: string;
  category: string;
}

// 48 synthetic invoices
export const SYNTHETIC_INVOICES: SyntheticInvoiceItem[] = [
  // 1-10: AWS Cloud Services (Clean baseline + 1 outlier + 1 PO mismatch)
  { invoice_id: 'INV-AWS-101', vendor: 'Amazon Web Services, Inc.', invoice_date: '2026-01-15', amount: 1250.00, expected_amount: 1250.00, po_number: 'PO-2026-01', currency: 'USD', category: 'Cloud Infrastructure' },
  { invoice_id: 'INV-AWS-102', vendor: 'Amazon Web Services, Inc.', invoice_date: '2026-02-15', amount: 1320.50, expected_amount: 1320.50, po_number: 'PO-2026-02', currency: 'USD', category: 'Cloud Infrastructure' },
  { invoice_id: 'INV-AWS-103', vendor: 'Amazon Web Services, Inc.', invoice_date: '2026-03-15', amount: 1290.00, expected_amount: 1290.00, po_number: 'PO-2026-03', currency: 'USD', category: 'Cloud Infrastructure' },
  { invoice_id: 'INV-AWS-104', vendor: 'Amazon Web Services, Inc.', invoice_date: '2026-04-15', amount: 1310.00, expected_amount: 1310.00, po_number: 'PO-2026-04', currency: 'USD', category: 'Cloud Infrastructure' },
  { invoice_id: 'INV-AWS-105', vendor: 'Amazon Web Services, Inc.', invoice_date: '2026-05-15', amount: 1285.00, expected_amount: 1285.00, po_number: 'PO-2026-05', currency: 'USD', category: 'Cloud Infrastructure' },
  { invoice_id: 'INV-AWS-106', vendor: 'Amazon Web Services, Inc.', invoice_date: '2026-06-15', amount: 1340.00, expected_amount: 1340.00, po_number: 'PO-2026-06', currency: 'USD', category: 'Cloud Infrastructure' },
  { invoice_id: 'INV-AWS-107', vendor: 'Amazon Web Services, Inc.', invoice_date: '2026-07-15', amount: 1295.00, expected_amount: 1295.00, po_number: 'PO-2026-07', currency: 'USD', category: 'Cloud Infrastructure' },
  // Anomaly: AWS Outlier surge ($14,800 vs ~$1,300 median)
  { invoice_id: 'INV-AWS-108', vendor: 'Amazon Web Services, Inc.', invoice_date: '2026-08-15', amount: 14800.00, expected_amount: 1300.00, po_number: 'PO-2026-08', currency: 'USD', category: 'Cloud Infrastructure' },
  { invoice_id: 'INV-AWS-109', vendor: 'Amazon Web Services, Inc.', invoice_date: '2026-09-15', amount: 1315.00, expected_amount: 1315.00, po_number: 'PO-2026-09', currency: 'USD', category: 'Cloud Infrastructure' },
  // Anomaly: PO Mismatch ($1,950 billed vs $1,300 expected)
  { invoice_id: 'INV-AWS-110', vendor: 'Amazon Web Services, Inc.', invoice_date: '2026-10-10', amount: 1950.00, expected_amount: 1300.00, po_number: 'PO-2026-10', currency: 'USD', category: 'Cloud Infrastructure' },

  // 11-16: Salesforce CRM (Clean SaaS subscriptions + 1 Exact Duplicate pair)
  { invoice_id: 'INV-SF-2026-Q1', vendor: 'Salesforce.com Inc.', invoice_date: '2026-01-01', amount: 5400.00, expected_amount: 5400.00, po_number: 'PO-SF-01', currency: 'USD', category: 'Software Subscriptions' },
  { invoice_id: 'INV-SF-2026-Q2', vendor: 'Salesforce.com Inc.', invoice_date: '2026-04-01', amount: 5400.00, expected_amount: 5400.00, po_number: 'PO-SF-02', currency: 'USD', category: 'Software Subscriptions' },
  { invoice_id: 'INV-SF-2026-Q3', vendor: 'Salesforce.com Inc.', invoice_date: '2026-07-01', amount: 5400.00, expected_amount: 5400.00, po_number: 'PO-SF-03', currency: 'USD', category: 'Software Subscriptions' },
  // Anomaly: Exact Duplicate of Q3 invoice (same vendor, same invoice id, same amount)
  { invoice_id: 'INV-SF-2026-Q3', vendor: 'Salesforce.com Inc.', invoice_date: '2026-07-15', amount: 5400.00, expected_amount: 5400.00, po_number: 'PO-SF-03', currency: 'USD', category: 'Software Subscriptions' },
  { invoice_id: 'INV-SF-2026-Q4', vendor: 'Salesforce.com Inc.', invoice_date: '2026-10-01', amount: 5400.00, expected_amount: 5400.00, po_number: 'PO-SF-04', currency: 'USD', category: 'Software Subscriptions' },

  // 17-22: Apex Office Supplies (Physical supplies, near duplicate test)
  { invoice_id: 'APX-7741', vendor: 'Apex Office Supplies', invoice_date: '2026-02-10', amount: 482.30, expected_amount: 482.30, po_number: 'PO-APX-01', currency: 'USD', category: 'Office Supplies' },
  { invoice_id: 'APX-7798', vendor: 'Apex Office Supplies', invoice_date: '2026-03-12', amount: 315.80, expected_amount: 315.80, po_number: 'PO-APX-02', currency: 'USD', category: 'Office Supplies' },
  { invoice_id: 'APX-8102', vendor: 'Apex Office Supplies', invoice_date: '2026-05-04', amount: 940.00, expected_amount: 940.00, po_number: 'PO-APX-03', currency: 'USD', category: 'Office Supplies' },
  // Anomaly: Near Duplicate of APX-8102 (Same vendor, same amount $940.00, issued 5 days apart, similar id APX-8102-B)
  { invoice_id: 'APX-8102-B', vendor: 'Apex Office Supplies', invoice_date: '2026-05-09', amount: 940.00, expected_amount: 940.00, po_number: 'PO-APX-03', currency: 'USD', category: 'Office Supplies' },
  { invoice_id: 'APX-8450', vendor: 'Apex Office Supplies', invoice_date: '2026-07-20', amount: 520.15, expected_amount: 520.15, po_number: 'PO-APX-04', currency: 'USD', category: 'Office Supplies' },
  { invoice_id: 'APX-8891', vendor: 'Apex Office Supplies', invoice_date: '2026-09-02', amount: 610.00, expected_amount: 610.00, po_number: 'PO-APX-05', currency: 'USD', category: 'Office Supplies' },

  // 23-28: Delta Legal Advisory (Professional legal counsel)
  { invoice_id: 'LEG-2026-01', vendor: 'Delta Legal Advisory LLP', invoice_date: '2026-01-31', amount: 3500.00, expected_amount: 3500.00, po_number: 'PO-LEG-01', currency: 'USD', category: 'Legal & Professional' },
  { invoice_id: 'LEG-2026-02', vendor: 'Delta Legal Advisory LLP', invoice_date: '2026-02-28', amount: 3500.00, expected_amount: 3500.00, po_number: 'PO-LEG-02', currency: 'USD', category: 'Legal & Professional' },
  { invoice_id: 'LEG-2026-03', vendor: 'Delta Legal Advisory LLP', invoice_date: '2026-03-31', amount: 3500.00, expected_amount: 3500.00, po_number: 'PO-LEG-03', currency: 'USD', category: 'Legal & Professional' },
  // Anomaly: Substantial Over-Billing Mismatch ($6,800 billed vs $3,500 PO retainer)
  { invoice_id: 'LEG-2026-04', vendor: 'Delta Legal Advisory LLP', invoice_date: '2026-04-30', amount: 6800.00, expected_amount: 3500.00, po_number: 'PO-LEG-04', currency: 'USD', category: 'Legal & Professional' },
  { invoice_id: 'LEG-2026-05', vendor: 'Delta Legal Advisory LLP', invoice_date: '2026-05-31', amount: 3500.00, expected_amount: 3500.00, po_number: 'PO-LEG-05', currency: 'USD', category: 'Legal & Professional' },

  // 29-34: Kinetic Digital Marketing
  { invoice_id: 'MKT-4011', vendor: 'Kinetic Digital Agency', invoice_date: '2026-02-01', amount: 2200.00, expected_amount: 2200.00, po_number: 'PO-MKT-01', currency: 'USD', category: 'Marketing' },
  { invoice_id: 'MKT-4012', vendor: 'Kinetic Digital Agency', invoice_date: '2026-03-01', amount: 2200.00, expected_amount: 2200.00, po_number: 'PO-MKT-02', currency: 'USD', category: 'Marketing' },
  { invoice_id: 'MKT-4013', vendor: 'Kinetic Digital Agency', invoice_date: '2026-04-01', amount: 2200.00, expected_amount: 2200.00, po_number: 'PO-MKT-03', currency: 'USD', category: 'Marketing' },
  // Anomaly: Future Dated Invoice (Dated Dec 2026 while audit is Oct 2026)
  { invoice_id: 'MKT-4099', vendor: 'Kinetic Digital Agency', invoice_date: '2026-12-15', amount: 2200.00, expected_amount: 2200.00, po_number: 'PO-MKT-09', currency: 'USD', category: 'Marketing' },
  { invoice_id: 'MKT-4014', vendor: 'Kinetic Digital Agency', invoice_date: '2026-05-01', amount: 2200.00, expected_amount: 2200.00, po_number: 'PO-MKT-04', currency: 'USD', category: 'Marketing' },

  // 35-40: Vertex Hardware & Equipment (Laptops, monitors - normal transactions without PO expected amount)
  { invoice_id: 'VRT-901', vendor: 'Vertex Hardware Corp', invoice_date: '2026-01-18', amount: 1850.00, currency: 'USD', category: 'Hardware' },
  { invoice_id: 'VRT-902', vendor: 'Vertex Hardware Corp', invoice_date: '2026-02-22', amount: 2100.00, currency: 'USD', category: 'Hardware' },
  { invoice_id: 'VRT-903', vendor: 'Vertex Hardware Corp', invoice_date: '2026-04-10', amount: 1950.00, currency: 'USD', category: 'Hardware' },
  { invoice_id: 'VRT-904', vendor: 'Vertex Hardware Corp', invoice_date: '2026-06-14', amount: 2400.00, currency: 'USD', category: 'Hardware' },
  { invoice_id: 'VRT-905', vendor: 'Vertex Hardware Corp', invoice_date: '2026-08-05', amount: 1890.00, currency: 'USD', category: 'Hardware' },
  // Anomaly: Outlier on Vertex Hardware ($18,500 vs ~$2,000 baseline)
  { invoice_id: 'VRT-999', vendor: 'Vertex Hardware Corp', invoice_date: '2026-09-25', amount: 18500.00, currency: 'USD', category: 'Hardware' },

  // 41-45: Cloudflare Network & Security (Clean SaaS baseline)
  { invoice_id: 'CF-SEC-01', vendor: 'Cloudflare Inc.', invoice_date: '2026-01-10', amount: 800.00, expected_amount: 800.00, po_number: 'PO-CF-01', currency: 'USD', category: 'Security' },
  { invoice_id: 'CF-SEC-02', vendor: 'Cloudflare Inc.', invoice_date: '2026-02-10', amount: 800.00, expected_amount: 800.00, po_number: 'PO-CF-02', currency: 'USD', category: 'Security' },
  { invoice_id: 'CF-SEC-03', vendor: 'Cloudflare Inc.', invoice_date: '2026-03-10', amount: 800.00, expected_amount: 800.00, po_number: 'PO-CF-03', currency: 'USD', category: 'Security' },
  { invoice_id: 'CF-SEC-04', vendor: 'Cloudflare Inc.', invoice_date: '2026-04-10', amount: 800.00, expected_amount: 800.00, po_number: 'PO-CF-04', currency: 'USD', category: 'Security' },
  { invoice_id: 'CF-SEC-05', vendor: 'Cloudflare Inc.', invoice_date: '2026-05-10', amount: 800.00, expected_amount: 800.00, po_number: 'PO-CF-05', currency: 'USD', category: 'Security' },
  // Anomaly: Future date on Cloudflare
  { invoice_id: 'CF-SEC-06', vendor: 'Cloudflare Inc.', invoice_date: '2026-11-20', amount: 800.00, expected_amount: 800.00, po_number: 'PO-CF-06', currency: 'USD', category: 'Security' },

  // 47-48: Clean miscellaneous
  { invoice_id: 'HR-BAMBOO-01', vendor: 'BambooHR LLC', invoice_date: '2026-03-01', amount: 450.00, expected_amount: 450.00, po_number: 'PO-HR-01', currency: 'USD', category: 'Human Resources' },
  { invoice_id: 'HR-BAMBOO-02', vendor: 'BambooHR LLC', invoice_date: '2026-04-01', amount: 450.00, expected_amount: 450.00, po_number: 'PO-HR-02', currency: 'USD', category: 'Human Resources' },
];

// Ground truth anomaly labels stored completely separately from detector inputs
export const GROUND_TRUTH_LABELS: GroundTruthLabel[] = [
  { invoice_id: 'INV-AWS-101', isAnomaly: false, description: 'Standard recurring cloud infrastructure charge.' },
  { invoice_id: 'INV-AWS-102', isAnomaly: false, description: 'Standard recurring cloud infrastructure charge.' },
  { invoice_id: 'INV-AWS-103', isAnomaly: false, description: 'Standard recurring cloud infrastructure charge.' },
  { invoice_id: 'INV-AWS-104', isAnomaly: false, description: 'Standard recurring cloud infrastructure charge.' },
  { invoice_id: 'INV-AWS-105', isAnomaly: false, description: 'Standard recurring cloud infrastructure charge.' },
  { invoice_id: 'INV-AWS-106', isAnomaly: false, description: 'Standard recurring cloud infrastructure charge.' },
  { invoice_id: 'INV-AWS-107', isAnomaly: false, description: 'Standard recurring cloud infrastructure charge.' },
  { invoice_id: 'INV-AWS-108', isAnomaly: true, expectedCategories: ['AMOUNT_OUTLIER'], description: 'Severe 11x outlier jump over historical AWS baseline.' },
  { invoice_id: 'INV-AWS-109', isAnomaly: false, description: 'Normal AWS monthly charge.' },
  { invoice_id: 'INV-AWS-110', isAnomaly: true, expectedCategories: ['AMOUNT_MISMATCH'], description: 'Over-billed by $650 (+50%) relative to approved PO.' },

  { invoice_id: 'INV-SF-2026-Q1', isAnomaly: false, description: 'Normal quarterly software subscription.' },
  { invoice_id: 'INV-SF-2026-Q2', isAnomaly: false, description: 'Normal quarterly software subscription.' },
  { invoice_id: 'INV-SF-2026-Q3', isAnomaly: true, expectedCategories: ['EXACT_DUPLICATE'], description: 'Exact duplicate invoice submitted twice under same ID and vendor.' },
  { invoice_id: 'INV-SF-2026-Q4', isAnomaly: false, description: 'Normal quarterly software subscription.' },

  { invoice_id: 'APX-7741', isAnomaly: false, description: 'Normal office supplies order.' },
  { invoice_id: 'APX-7798', isAnomaly: false, description: 'Normal office supplies order.' },
  { invoice_id: 'APX-8102', isAnomaly: true, expectedCategories: ['POTENTIAL_DUPLICATE'], description: 'Near duplicate candidate paired with APX-8102-B.' },
  { invoice_id: 'APX-8102-B', isAnomaly: true, expectedCategories: ['POTENTIAL_DUPLICATE'], description: 'Near duplicate with identical amount within 5 days and near ID.' },
  { invoice_id: 'APX-8450', isAnomaly: false, description: 'Normal office supplies order.' },
  { invoice_id: 'APX-8891', isAnomaly: false, description: 'Normal office supplies order.' },

  { invoice_id: 'LEG-2026-01', isAnomaly: false, description: 'Normal monthly legal retainer.' },
  { invoice_id: 'LEG-2026-02', isAnomaly: false, description: 'Normal monthly legal retainer.' },
  { invoice_id: 'LEG-2026-03', isAnomaly: false, description: 'Normal monthly legal retainer.' },
  { invoice_id: 'LEG-2026-04', isAnomaly: true, expectedCategories: ['AMOUNT_MISMATCH'], description: 'Billed $6,800 vs $3,500 PO retainer limit.' },
  { invoice_id: 'LEG-2026-05', isAnomaly: false, description: 'Normal monthly legal retainer.' },

  { invoice_id: 'MKT-4011', isAnomaly: false, description: 'Normal agency retainer.' },
  { invoice_id: 'MKT-4012', isAnomaly: false, description: 'Normal agency retainer.' },
  { invoice_id: 'MKT-4013', isAnomaly: false, description: 'Normal agency retainer.' },
  { invoice_id: 'MKT-4099', isAnomaly: true, expectedCategories: ['FUTURE_DATE'], description: 'Future post-dated invoice (Dec 2026).' },
  { invoice_id: 'MKT-4014', isAnomaly: false, description: 'Normal agency retainer.' },

  { invoice_id: 'VRT-901', isAnomaly: false, description: 'Clean hardware purchase without PO expected amount.' },
  { invoice_id: 'VRT-902', isAnomaly: false, description: 'Clean hardware purchase without PO expected amount.' },
  { invoice_id: 'VRT-903', isAnomaly: false, description: 'Clean hardware purchase without PO expected amount.' },
  { invoice_id: 'VRT-904', isAnomaly: false, description: 'Clean hardware purchase without PO expected amount.' },
  { invoice_id: 'VRT-905', isAnomaly: false, description: 'Clean hardware purchase without PO expected amount.' },
  { invoice_id: 'VRT-999', isAnomaly: true, expectedCategories: ['AMOUNT_OUTLIER'], description: 'Unusually large hardware charge ($18,500 vs $2,000 baseline).' },

  { invoice_id: 'CF-SEC-01', isAnomaly: false, description: 'Normal recurring security billing.' },
  { invoice_id: 'CF-SEC-02', isAnomaly: false, description: 'Normal recurring security billing.' },
  { invoice_id: 'CF-SEC-03', isAnomaly: false, description: 'Normal recurring security billing.' },
  { invoice_id: 'CF-SEC-04', isAnomaly: false, description: 'Normal recurring security billing.' },
  { invoice_id: 'CF-SEC-05', isAnomaly: false, description: 'Normal recurring security billing.' },
  { invoice_id: 'CF-SEC-06', isAnomaly: true, expectedCategories: ['FUTURE_DATE'], description: 'Future post-dated invoice (Nov 2026).' },

  { invoice_id: 'HR-BAMBOO-01', isAnomaly: false, description: 'Normal HR software fee.' },
  { invoice_id: 'HR-BAMBOO-02', isAnomaly: false, description: 'Normal HR software fee.' },
];

/**
 * Sanitized CSV string exporter to prevent spreadsheet injection attacks.
 */
export function generateSyntheticCsvString(): string {
  const headers = ['invoice_id', 'vendor', 'invoice_date', 'amount', 'expected_amount', 'po_number', 'currency', 'category'];
  const rows = SYNTHETIC_INVOICES.map(inv => [
    sanitizeCsvCell(inv.invoice_id),
    sanitizeCsvCell(inv.vendor),
    sanitizeCsvCell(inv.invoice_date),
    inv.amount.toFixed(2),
    inv.expected_amount !== undefined ? inv.expected_amount.toFixed(2) : '',
    sanitizeCsvCell(inv.po_number || ''),
    sanitizeCsvCell(inv.currency),
    sanitizeCsvCell(inv.category),
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Generates an enterprise-scale synthetic workload of 1,000 invoices
 * across 50 vendors for throughput and scalability benchmarking.
 */
export function generateEnterpriseWorkload(count: number = 1000): Invoice[] {
  const vendors = [
    'Amazon Web Services, Inc.', 'Salesforce.com Inc.', 'Google Cloud Platform',
    'Microsoft Azure', 'Slack Technologies', 'Zoom Video Communications',
    'Atlassian Pty Ltd', 'HubSpot Inc.', 'Datadog Inc.', 'MongoDB Inc.',
    'Snowflake Inc.', 'Stripe Payments', 'Twilio Inc.', 'Cloudflare Inc.',
    'Figma Inc.', 'Notion Labs', 'GitHub Inc.', 'Box Inc.', 'Zendesk Inc.',
    'Apex Office Supplies', 'Delta Legal Advisory LLP', 'Vertex Hardware Corp',
    'Kinetic Digital Agency', 'BambooHR LLC', 'Workday Inc.'
  ];

  const categories = [
    'Cloud Infrastructure', 'Software Subscriptions', 'Office Supplies',
    'Legal & Professional', 'Marketing', 'Hardware', 'Human Resources',
    'Facilities', 'Telecom', 'Security'
  ];

  const invoices: Invoice[] = [];

  for (let i = 1; i <= count; i++) {
    const vendorIdx = i % vendors.length;
    const vendor = vendors[vendorIdx];
    const category = categories[i % categories.length];
    const month = String((i % 9) + 1).padStart(2, '0');
    const day = String((i % 28) + 1).padStart(2, '0');
    const date = `2026-${month}-${day}`;
    const baseAmount = 500 + (vendorIdx * 150) + (i % 20) * 10;

    let amount = baseAmount;
    let expectedAmount: number | undefined = baseAmount;
    let invoiceId = `ENT-INV-${10000 + i}`;

    // Inject known anomalies deterministically
    if (i % 80 === 0) {
      // Outlier surge
      amount = baseAmount * 12;
    } else if (i % 65 === 0) {
      // PO Mismatch
      amount = baseAmount * 1.45;
    } else if (i % 50 === 0) {
      // Exact duplicate of previous record
      invoiceId = `ENT-INV-${10000 + i - 1}`;
    }

    invoices.push({
      id: `ent-inv-${i}`,
      invoice_id: invoiceId,
      vendor,
      invoice_date: date,
      amount: Math.round(amount * 100) / 100,
      expected_amount: expectedAmount,
      po_number: `PO-ENT-${1000 + (i % 200)}`,
      currency: 'USD',
      category,
    });
  }

  return invoices;
}
