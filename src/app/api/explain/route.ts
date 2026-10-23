import { NextRequest, NextResponse } from 'next/server';
import { explainInvoiceWithGemini } from '@/lib/gemini';
import { InvoiceAnalysis } from '@/types/invoice';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || !body.analysis || !body.analysis.invoice) {
      return NextResponse.json(
        { error: 'Invalid request payload. Expected { analysis: InvoiceAnalysis }' },
        { status: 400 }
      );
    }

    const analysis = body.analysis as InvoiceAnalysis;

    // Call Gemini with server-side environment key
    const explanation = await explainInvoiceWithGemini(analysis);

    return NextResponse.json({
      success: true,
      explanation,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('API /api/explain error:', errorMsg);

    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
        fallbackExplanation: {
          summary: 'AI reasoning temporarily unavailable. Audit rules remains 100% operational.',
          evidence: ['Server error encountered during explanation generation.'],
          possible_explanations: ['Gemini service endpoint unreachable or request timed out.'],
          recommended_action: 'Perform manual visual audit using deterministic evidence points.',
          needs_human_review: true,
          limitations: ['Fallback explanation generated due to runtime exception.'],
        },
      },
      { status: 500 }
    );
  }
}
