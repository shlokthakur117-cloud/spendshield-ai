import { NextRequest, NextResponse } from 'next/server';
import { explainInvoiceWithGemini } from '@/lib/gemini';
import { validateExplainPayload } from '@/lib/security';

// In-memory rate limiting guard to protect server from abusive Gemini request floods
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS_PER_MINUTE = 30;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60 * 1000 });
    return true;
  }

  if (entry.count >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // 1. IP rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded: Maximum 30 AI explanation requests per minute. Please try again shortly.',
        },
        { status: 429 }
      );
    }

    // 2. Read and parse body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Malformed JSON payload.' },
        { status: 400 }
      );
    }

    // 3. Strict security validation
    const validation = validateExplainPayload(body);
    if (!validation.valid || !validation.sanitizedAnalysis) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Invalid request payload.' },
        { status: 400 }
      );
    }

    // 4. Use only the server-configured Gemini key. Never accept client-supplied credentials.
    const explanation = await explainInvoiceWithGemini(validation.sanitizedAnalysis);

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
          summary: 'AI reasoning temporarily unavailable. Audit rules remain 100% operational.',
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
