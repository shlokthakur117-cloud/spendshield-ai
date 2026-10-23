import Papa from 'papaparse';
import { Invoice, ParseResult, RawInvoiceRow } from '@/types/invoice';

// Canonical header mapping aliases
const ALIASES: Record<string, string[]> = {
  invoice_id: ['invoice_id', 'invoice_number', 'invoice_no', 'invoice #', 'inv_id', 'invoiceno', 'invoice', 'id'],
  vendor: ['vendor', 'vendor_name', 'supplier', 'merchant', 'biller', 'payee', 'company', 'vendor name'],
  invoice_date: ['invoice_date', 'date', 'bill_date', 'inv_date', 'issued_date', 'invoicedate', 'billing_date'],
  amount: ['amount', 'total', 'total_amount', 'invoice_amount', 'cost', 'billed_amount', 'subtotal', 'gross_amount'],
  expected_amount: ['expected_amount', 'po_amount', 'target_amount', 'approved_amount', 'expected', 'expected amount'],
  po_number: ['po_number', 'po_no', 'purchase_order', 'po_#', 'po', 'po number'],
  due_date: ['due_date', 'payment_due', 'due date'],
  currency: ['currency', 'curr', 'currency_code'],
  category: ['category', 'expense_type', 'department', 'type', 'service_type'],
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s_-]+/g, '_');
}

function resolveCanonicalField(cleanHeader: string): string | null {
  for (const [canonical, aliasList] of Object.entries(ALIASES)) {
    if (cleanHeader === canonical) return canonical;
    for (const alias of aliasList) {
      if (cleanHeader === normalizeHeader(alias)) {
        return canonical;
      }
    }
  }
  return null;
}

export function cleanCurrencyAmount(val: unknown): number | null {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : Math.round(val * 100) / 100;
  
  const str = String(val).trim();
  // Remove currency symbols, commas, spaces
  const cleaned = str.replace(/[$,€£₹\s]/g, '');
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return null;
  return Math.round(parsed * 100) / 100;
}

export function parseDateToISO(val: unknown): string | null {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;

  // Handle YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(str + 'T00:00:00Z');
    return isNaN(d.getTime()) ? null : str;
  }

  // Handle MM/DD/YYYY or DD/MM/YYYY
  const slashParts = str.split('/');
  if (slashParts.length === 3) {
    const p0 = parseInt(slashParts[0], 10);
    const p1 = parseInt(slashParts[1], 10);
    const p2 = parseInt(slashParts[2], 10);
    
    // If year is 4 digits at the end
    if (p2 >= 1970 && p2 <= 2100) {
      // standard US MM/DD/YYYY or Intl DD/MM/YYYY
      const month = p0 > 12 ? p1 : p0;
      const day = p0 > 12 ? p0 : p1;
      const monthStr = String(month).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const iso = `${p2}-${monthStr}-${dayStr}`;
      const d = new Date(iso + 'T00:00:00Z');
      return isNaN(d.getTime()) ? null : iso;
    }
  }

  // Fallback to standard Date.parse
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return null;
}

export function parseInvoiceCsv(csvContent: string): ParseResult {
  const result: ParseResult = {
    invoices: [],
    errors: [],
    warnings: [],
    totalRowsRead: 0,
    validRowsCount: 0,
  };

  if (!csvContent || !csvContent.trim()) {
    result.errors.push('Empty CSV file provided.');
    return result;
  }

  // Maximum file size check (approx 5MB text)
  if (csvContent.length > 5 * 1024 * 1024) {
    result.errors.push('File size exceeds 5MB limit. Please provide a smaller batch for analysis.');
    return result;
  }

  const parsed = Papa.parse<RawInvoiceRow>(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
  });

  if (parsed.errors && parsed.errors.length > 0) {
    for (const err of parsed.errors.slice(0, 5)) {
      result.warnings.push(`CSV Syntax (Line ${err.row ?? '?'}) : ${err.message}`);
    }
  }

  if (!parsed.data || parsed.data.length === 0) {
    result.errors.push('No data rows found in CSV file.');
    return result;
  }

  const rawHeaders = parsed.meta.fields || [];
  if (rawHeaders.length === 0) {
    result.errors.push('Missing CSV headers.');
    return result;
  }

  // Map header keys to canonical fields
  const fieldMap: Record<string, string> = {};
  for (const h of rawHeaders) {
    const canonical = resolveCanonicalField(normalizeHeader(h));
    if (canonical) {
      fieldMap[h] = canonical;
    }
  }

  // Validate mandatory fields exist in header map
  const mappedCanonicals = new Set(Object.values(fieldMap));
  const required = ['invoice_id', 'vendor', 'invoice_date', 'amount'];
  const missing = required.filter(r => !mappedCanonicals.has(r));

  if (missing.length > 0) {
    result.errors.push(
      `Missing required columns: ${missing.join(', ')}. Found columns: [${rawHeaders.join(', ')}].`
    );
    return result;
  }

  result.totalRowsRead = parsed.data.length;

  parsed.data.forEach((row, idx) => {
    const rowNum = idx + 2; // account for 1-based index and header line
    const extracted: Record<string, unknown> = {};

    for (const [rawHeader, canonicalField] of Object.entries(fieldMap)) {
      extracted[canonicalField] = row[rawHeader];
    }

    const rawId = extracted['invoice_id'];
    const rawVendor = extracted['vendor'];
    const rawDate = extracted['invoice_date'];
    const rawAmount = extracted['amount'];

    // Critical row validations
    if (!rawId || String(rawId).trim() === '') {
      result.warnings.push(`Row ${rowNum}: Skipped due to missing invoice ID.`);
      return;
    }
    if (!rawVendor || String(rawVendor).trim() === '') {
      result.warnings.push(`Row ${rowNum} (${rawId}): Missing vendor name.`);
      // We will still include it with placeholder so data quality check catches it
    }

    const cleanAmount = cleanCurrencyAmount(rawAmount);
    if (cleanAmount === null) {
      result.warnings.push(`Row ${rowNum} (${rawId}): Invalid numerical amount "${rawAmount}". Record omitted.`);
      return;
    }

    if (cleanAmount < 0) {
      result.warnings.push(`Row ${rowNum} (${rawId}): Negative invoice amount ($${cleanAmount}). Credits/refunds should be processed separately.`);
    }

    const parsedDate = parseDateToISO(rawDate);
    const invoiceDate = parsedDate || (rawDate ? String(rawDate).trim() : '');

    if (!parsedDate && rawDate) {
      result.warnings.push(`Row ${rowNum} (${rawId}): Unparseable date format "${rawDate}".`);
    }

    // Expected amount (only if provided and non-empty)
    const expectedAmountRaw = extracted['expected_amount'];
    let expectedAmount: number | undefined = undefined;
    if (expectedAmountRaw !== undefined && expectedAmountRaw !== null && String(expectedAmountRaw).trim() !== '') {
      const parsedExpected = cleanCurrencyAmount(expectedAmountRaw);
      if (parsedExpected !== null) {
        expectedAmount = parsedExpected;
      }
    }

    const invoice: Invoice = {
      id: `inv-${idx + 1}-${String(rawId).trim()}`,
      invoice_id: String(rawId).trim(),
      vendor: rawVendor ? String(rawVendor).trim() : 'UNKNOWN VENDOR',
      invoice_date: invoiceDate,
      amount: cleanAmount,
      currency: extracted['currency'] ? String(extracted['currency']).trim().toUpperCase() : 'USD',
      category: extracted['category'] ? String(extracted['category']).trim() : 'General & Admin',
      po_number: extracted['po_number'] ? String(extracted['po_number']).trim() : undefined,
      expected_amount: expectedAmount,
      due_date: extracted['due_date'] ? (parseDateToISO(extracted['due_date']) || String(extracted['due_date']).trim()) : undefined,
    };

    result.invoices.push(invoice);
  });

  result.validRowsCount = result.invoices.length;

  if (result.invoices.length === 0 && result.errors.length === 0) {
    result.errors.push('No valid invoice rows could be extracted from the file.');
  }

  return result;
}
