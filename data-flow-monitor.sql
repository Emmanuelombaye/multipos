-- SQL Script: System Data Flow Monitor
-- Paste this into your Supabase SQL Editor to see how your Cashier actions affect the Admin reports.

-- 1. REAL-TIME REVENUE (The source for Dashboard & Analytics)
SELECT 
    b.name as branch_name,
    COUNT(t.id) as total_sales_count,
    SUM(t.total) as total_revenue_kes
FROM branches b
LEFT JOIN transactions t ON b.id = t.branch_id
WHERE t.created_at >= CURRENT_DATE -- Shows only today
GROUP BY b.name;

-- 2. LIVE STOCK LEVELS (The source for 'Closing Stock' and 'Low Stock Alerts')
-- This shows you exactly what weight is currently on the shelf for each product.
SELECT 
    b.name as branch_name,
    p.name as product_name,
    bs.current_stock as live_weight_kg,
    p.low_stock_threshold as warning_threshold,
    CASE 
        WHEN bs.current_stock < p.low_stock_threshold THEN '⚠️ REFILL NEEDED'
        ELSE '✅ OK'
    END as stock_status
FROM branch_stock bs
JOIN branches b ON bs.branch_id = b.id
JOIN products p ON bs.product_id = p.id
ORDER BY b.name, p.name;

-- 3. EXPENSE AUDIT TRAIL (The source for Financials Tab)
SELECT 
    e.created_at as time_logged,
    b.name as branch,
    e.category,
    e.amount as kes,
    e.description,
    u.email as recorded_by
FROM expenses e
JOIN branches b ON e.branch_id = b.id
JOIN users u ON e.recorded_by = u.id
WHERE e.created_at >= CURRENT_DATE
ORDER BY e.created_at DESC;

-- 4. THE RECONCILIATION SOURCE
-- This is where the 'Expected Sales' math comes from.
SELECT 
    sh.date,
    b.name as branch,
    p.name as product,
    sh.opening_stock as start_weight,
    sh.closing_stock as end_weight,
    (sh.opening_stock - COALESCE(sh.closing_stock, bs.current_stock)) as amount_sold_kg
FROM stock_history sh
JOIN branches b ON sh.branch_id = b.id
JOIN products p ON sh.product_id = p.id
JOIN branch_stock bs ON sh.branch_id = bs.branch_id AND sh.product_id = bs.product_id
WHERE sh.date = CURRENT_DATE;
