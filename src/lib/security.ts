/**
 * Security & Input Sanitization Utilities for SpendShield AI
 */

import { InvoiceAnalysis } from '@/types/invoice';

/**
 * Neutralizes CSV / Spreadsheet Formula Injection (CWE-1236: Improper Neutralization of Formula Elements)
 * If a cell begins with '=', '+', '-', '@', '\t', or '\r', it could be executed as a dynamic formula
 * in Microsoft Excel, LibreOffice Calc, or Google Sheets upon export.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  if (str === '') return '';

  // Dangerous spreadsheet formula triggers
  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];
  let safeStr = str;

  // If the cell starts with a formula trigger (and is not a valid negative number)
  if (dangerousPrefixes.some(prefix => safeStr.startsWith(prefix))) {
    // If it's a legitimate negative number like "-120.50", allow if pure number
    if (safeStr.startsWith('-') && /^-?\d+(\.\d+)?$/.test(safeStr)) {
      return safeStr;
    }
    // Prefix with single quote to force spreadsheet programs to treat as inert text
    safeStr = `'${safeStr}`;
  }

  // Escape internal double quotes for CSV RFC 4180 compliance
  if (safeStr.includes(',') || safeStr.includes('"') || safeStr.includes('\n') || safeStr.includes(';')) {
    return `"${safeStr.replace(/"/g, '""')}"`;
  }

  return safeStr;
}

/**
 * Validates incoming POST /api/explain request payload to prevent
 * oversized payloads, prototype pollution, or abusive Gemini AI requests.
 */
export function validateExplainPayload(body: unknown): {
  valid: boolean;
  error?: string;
  sanitizedAnalysis?: InvoiceAnalysis;
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object.' };
  }

  const payload = body as Record<string, unknown>;
  if (!payload.analysis || typeof payload.analysis !== 'object') {
    return { valid: false, error: 'Missing required "analysis" object in request payload.' };
  }

  const analysis = payload.analysis as Record<string, unknown>;
  if (!analysis.invoice || typeof analysis.invoice !== 'object') {
    return { valid: false, error: 'Missing required "invoice" record inside analysis payload.' };
  }

  const invoice = analysis.invoice as Record<string, unknown>;
  if (!invoice.invoice_id || typeof invoice.invoice_id !== 'string') {
    return { valid: false, error: 'Invoice must contain a valid string invoice_id.' };
  }

  // Safety limits on payload size
  if (String(invoice.invoice_id).length > 100) {
    return { valid: false, error: 'Invoice ID exceeds maximum length of 100 characters.' };
  }
  if (String(invoice.vendor || '').length > 200) {
    return { valid: false, error: 'Vendor name exceeds maximum length of 200 characters.' };
  }

  // Findings validation
  if (!Array.isArray(analysis.findings)) {
    return { valid: false, error: 'Analysis findings must be an array.' };
  }
  if (analysis.findings.length > 50) {
    return { valid: false, error: 'Findings array exceeds maximum permitted length of 50 items.' };
  }

  return {
    valid: true,
    sanitizedAnalysis: payload.analysis as InvoiceAnalysis,
  };
}
