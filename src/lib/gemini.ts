import { GoogleGenAI } from '@google/genai';
import { GeminiExplanation, InvoiceAnalysis } from '@/types/invoice';

export interface ExplainRequestPayload {
  analysis: InvoiceAnalysis;
  relatedInvoices?: InvoiceAnalysis[];
}

export function generateDeterministicFallbackExplanation(
  analysis: InvoiceAnalysis,
  reason: string
): GeminiExplanation {
  const inv = analysis.invoice;
  const findingTitles = analysis.findings.map(f => f.title);
  const evidenceList = analysis.findings.flatMap(f => f.evidence);

  const possibleExplanations: string[] = [];
  if (analysis.findings.some(f => f.category === 'EXACT_DUPLICATE')) {
    possibleExplanations.push('Vendor may have resubmitted the same invoice via multiple channels (e.g. email and billing portal).');
    possibleExplanations.push('Accounting staff may have recorded the invoice twice during batch ingestion.');
  }
  if (analysis.findings.some(f => f.category === 'POTENTIAL_DUPLICATE')) {
    possibleExplanations.push('Monthly recurring invoice reissued under a revised billing code or revised scope.');
    possibleExplanations.push('Progressive milestone invoice sharing identical fee schedules.');
  }
  if (analysis.findings.some(f => f.category === 'AMOUNT_MISMATCH')) {
    possibleExplanations.push('Discrepancy caused by unapproved scope expansion, unexpected freight/sales tax, or price escalation.');
    possibleExplanations.push('Purchase order line items were entered with outdated unit pricing.');
  }
  if (analysis.findings.some(f => f.category === 'AMOUNT_OUTLIER')) {
    possibleExplanations.push('One-time annual licensing, hardware purchase, or bulk quarterly replenishment.');
    possibleExplanations.push('Billing error with an extra zero or decimal shift.');
  }
  if (analysis.findings.some(f => f.category === 'FUTURE_DATE')) {
    possibleExplanations.push('Invoice post-dated for future delivery or end-of-quarter accounting.');
  }
  if (possibleExplanations.length === 0) {
    possibleExplanations.push('No significant risk anomalies detected; routine business invoice.');
  }

  let recommendedAction = 'Standard accounting verification. Check vendor master agreement.';
  if (analysis.riskLevel === 'CRITICAL') {
    recommendedAction = 'STOP DISBURSEMENT. Contact vendor account manager and cross-reference bank payment history.';
  } else if (analysis.riskLevel === 'HIGH') {
    recommendedAction = 'Place payment on hold pending procurement confirmation and PO adjustment approval.';
  } else if (analysis.riskLevel === 'MEDIUM') {
    recommendedAction = 'Request approval from department budget owner before releasing funds.';
  }

  return {
    summary: `Audit Rule Analysis: ${findingTitles.length > 0 ? findingTitles.join('; ') : 'Normal invoice'}. Note: Gemini LLM explanation is currently in fallback mode (${reason}). Deterministic risk evaluation remains 100% active.`,
    evidence: evidenceList.length > 0 ? evidenceList : ['Transaction matches normal vendor baseline parameters.'],
    possible_explanations: possibleExplanations,
    recommended_action: recommendedAction,
    needs_human_review: analysis.riskLevel === 'HIGH' || analysis.riskLevel === 'CRITICAL' || analysis.findings.length > 0,
    limitations: [
      'Generated via deterministic rules engine fallback without live LLM inference.',
      'Anomalies indicate statistical or logical deviations, not verified legal proof of fraud.',
    ],
    generated_at: new Date().toISOString(),
    model_used: 'SpendShield-RuleEngine-Fallback',
  };
}

export async function explainInvoiceWithGemini(
  analysis: InvoiceAnalysis,
  apiKeyOverride?: string
): Promise<GeminiExplanation> {
  const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
    return generateDeterministicFallbackExplanation(
      analysis,
      'GEMINI_API_KEY not configured in server environment'
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const invoice = analysis.invoice;
    const prompt = `
You are the SpendShield AI Financial Audit Agent.
Analyze the following invoice and deterministic audit findings.
Do NOT fabricate invoices, alter calculations, change numbers, or accuse any party of criminal fraud.
Your task is to provide an objective, professional, and explainable audit summary for a financial controller.

INVOICE DETAILS:
- Invoice ID: ${invoice.invoice_id}
- Vendor: ${invoice.vendor}
- Date: ${invoice.invoice_date}
- Amount: $${invoice.amount.toFixed(2)} ${invoice.currency}
- Category: ${invoice.category || 'N/A'}
- PO Reference: ${invoice.po_number || 'None'}
- Expected / PO Amount: ${invoice.expected_amount !== undefined ? `$${invoice.expected_amount.toFixed(2)}` : 'None specified'}

DETERMINISTIC AUDIT FINDINGS:
- Overall Risk Score: ${analysis.overallScore}/100 (${analysis.riskLevel})
- Findings:
${analysis.findings.map(f => `  * [${f.severity}] ${f.title}: ${f.description}\n    Evidence: ${f.evidence.join(' | ')}`).join('\n')}

INSTRUCTIONS:
Return a valid JSON object strictly matching this schema:
{
  "summary": "Clear, concise 2-sentence executive summary of the risk findings",
  "evidence": ["Direct factual points derived ONLY from the provided invoice and findings"],
  "possible_explanations": ["2-3 realistic benign or operational explanations (e.g. clerical error, scope expansion, duplicate transmission)"],
  "recommended_action": "Actionable, professional next step for the finance controller (e.g. hold payment, verify PO with department lead)",
  "needs_human_review": true or false,
  "limitations": ["Transparent limitations of this AI analysis, noting that anomalies are not proof of fraud"]
}
`;

    // Use current recommended Flash model: gemini-3.8-flash (with automatic fallback to gemini-2.5-flash if needed)
    let response;
    let activeModel = 'gemini-3.8-flash';
    try {
      response = await ai.models.generateContent({
        model: activeModel,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });
    } catch (modelErr: unknown) {
      const errStr = String(modelErr);
      if (errStr.includes('404') || errStr.includes('NOT_FOUND') || errStr.includes('not found')) {
        // Fallback model trial
        activeModel = 'gemini-2.5-flash';
        response = await ai.models.generateContent({
          model: activeModel,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });
      } else {
        throw modelErr;
      }
    }

    const text = response.text;
    if (!text) {
      return generateDeterministicFallbackExplanation(analysis, 'Empty response from Gemini API');
    }

    const parsed = JSON.parse(text);

    // Validate expected fields
    if (
      typeof parsed.summary !== 'string' ||
      !Array.isArray(parsed.evidence) ||
      !Array.isArray(parsed.possible_explanations) ||
      typeof parsed.recommended_action !== 'string'
    ) {
      throw new Error('Gemini response missing required schema fields');
    }

    return {
      summary: parsed.summary,
      evidence: parsed.evidence.map(String),
      possible_explanations: parsed.possible_explanations.map(String),
      recommended_action: parsed.recommended_action,
      needs_human_review: Boolean(parsed.needs_human_review),
      limitations: Array.isArray(parsed.limitations)
        ? parsed.limitations.map(String)
        : ['AI explanations provide advisory reasoning, not legal or audit certainty.'],
      generated_at: new Date().toISOString(),
      model_used: activeModel,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn('[Gemini Explainer Fallback Triggered]:', errorMsg);
    return generateDeterministicFallbackExplanation(analysis, errorMsg);
  }
}
