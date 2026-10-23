-- SpendShield AI: Production Supabase / PostgreSQL Schema
-- Row Level Security (RLS) enabled on all tables

-- 1. Audit Batches Table
CREATE TABLE IF NOT EXISTS audit_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    batch_name TEXT NOT NULL,
    total_invoices INTEGER NOT NULL DEFAULT 0,
    total_analyzed_value NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    flagged_count INTEGER NOT NULL DEFAULT 0,
    high_risk_count INTEGER NOT NULL DEFAULT 0,
    flagged_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    execution_duration_ms INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE audit_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only read their own audit batches"
    ON audit_batches FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audit batches"
    ON audit_batches FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 2. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES audit_batches(id) ON DELETE CASCADE,
    invoice_id TEXT NOT NULL,
    vendor TEXT NOT NULL,
    invoice_date DATE,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    category TEXT,
    po_number TEXT,
    expected_amount NUMERIC(12, 2),
    due_date DATE,
    overall_score INTEGER NOT NULL DEFAULT 0,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    review_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (review_status IN ('PENDING', 'NEEDS_REVIEW', 'RESOLVED', 'DISMISSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_invoices_batch ON invoices(batch_id);
CREATE INDEX IF NOT EXISTS idx_invoices_vendor ON invoices(vendor);
CREATE INDEX IF NOT EXISTS idx_invoices_risk ON invoices(risk_level);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoices within their batches"
    ON invoices FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM audit_batches
            WHERE audit_batches.id = invoices.batch_id
            AND audit_batches.user_id = auth.uid()
        )
    );

-- 3. Risk Findings Table
CREATE TABLE IF NOT EXISTS risk_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    severity TEXT NOT NULL,
    score_impact INTEGER NOT NULL DEFAULT 0,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
    related_invoice_ids JSONB DEFAULT '[]'::jsonb,
    is_data_quality_only BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_findings_invoice ON risk_findings(invoice_id);

ALTER TABLE risk_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view findings on their invoices"
    ON risk_findings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM invoices
            JOIN audit_batches ON audit_batches.id = invoices.batch_id
            WHERE invoices.id = risk_findings.invoice_id
            AND audit_batches.user_id = auth.uid()
        )
    );

-- 4. Review Events & Audit Trail
CREATE TABLE IF NOT EXISTS review_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES auth.users(id),
    decision TEXT NOT NULL CHECK (decision IN ('NEEDS_REVIEW', 'RESOLVED', 'DISMISSED')),
    reviewer_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE review_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view review events for their invoices"
    ON review_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM invoices
            JOIN audit_batches ON audit_batches.id = invoices.batch_id
            WHERE invoices.id = review_events.invoice_id
            AND audit_batches.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert review events for their invoices"
    ON review_events FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM invoices
            JOIN audit_batches ON audit_batches.id = invoices.batch_id
            WHERE invoices.id = review_events.invoice_id
            AND audit_batches.user_id = auth.uid()
        )
    );
