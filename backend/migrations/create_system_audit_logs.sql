-- Create system_audit_logs table to track automated audits
CREATE TABLE IF NOT EXISTS system_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_type VARCHAR(50) NOT NULL,
  audit_date DATE NOT NULL,
  audit_time TIME NOT NULL,
  branches_processed INTEGER DEFAULT 0,
  products_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  discrepancies_fixed INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON system_audit_logs(audit_date DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_type ON system_audit_logs(audit_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON system_audit_logs(status);

-- Add comment
COMMENT ON TABLE system_audit_logs IS 'Tracks all automated system audits including daily stock audits and reconciliations';
