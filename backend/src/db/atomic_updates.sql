-- Function to safely reduce stock in an atomic way
-- This prevents race conditions where multiple transactions might read the same stock value
CREATE OR REPLACE FUNCTION reduce_branch_stock(
    p_branch_id UUID,
    p_product_id UUID,
    p_quantity DECIMAL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO branch_stock (branch_id, product_id, current_stock, updated_at)
    VALUES (p_branch_id, p_product_id, 0, NOW())
    ON CONFLICT (branch_id, product_id)
    DO UPDATE SET 
        current_stock = GREATEST(0, branch_stock.current_stock - p_quantity),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
