-- Data only. The schema is created by TypeORM migrations: run `npm run migration:run` first,
-- then `npm run db:seed`.

-- 1. Seed 50,000 Customers
INSERT INTO customers (name, email)
SELECT 'Customer ' || g, 'customer' || g || '@example.com'
FROM generate_series(1, 50000) AS g;

-- 2. Seed 10,000 Products across 500 Merchants
INSERT INTO products (merchant_id, title, price)
SELECT (g % 500) + 1, 'Product SKU-' || g, ROUND((random() * 500 + 10)::numeric, 2)
FROM generate_series(1, 10000) AS g;

-- 3. Seed 2,000,000 Orders (Bump to 10,000,000 if you have 10GB free disk)
INSERT INTO orders (merchant_id, customer_id, status, total_amount, shipping_address, notes, created_at)
SELECT 
    -- Merchant 42 is our "Super Merchant" (gets ~20% of all orders to test data skew!)
    CASE WHEN random() < 0.20 THEN 42 ELSE (floor(random() * 500) + 1)::bigint END,
    (floor(random() * 50000) + 1)::bigint,
    (ARRAY['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'])[floor(random() * 5) + 1]::order_status,
    ROUND((random() * 1000 + 20)::numeric, 2),
    -- Realistic address, kept at roughly the same byte size as before so SELECT * stays heavy
    jsonb_build_object(
        'line1', 'House ' || (floor(random() * 999) + 1) || ', '
                 || (ARRAY['MG Road', 'Mall Road', 'Model Town', 'Civil Lines', 'Phase 7', 'Ring Road'])[floor(random() * 6) + 1],
        'line2', 'Sector ' || (floor(random() * 70) + 1),
        'landmark', (ARRAY['Near City Hospital', 'Opp. Govt School', 'Behind Bus Stand', 'Near HDFC Bank', 'Next to Gurudwara'])[floor(random() * 5) + 1],
        'city',  (ARRAY['Chandigarh', 'Mohali', 'Ludhiana', 'Amritsar', 'Jalandhar', 'New Delhi', 'Pune', 'Bengaluru'])[c],
        'state', (ARRAY['Chandigarh', 'Punjab', 'Punjab', 'Punjab', 'Punjab', 'Delhi', 'Maharashtra', 'Karnataka'])[c],
        'zip',   (ARRAY['160017', '160062', '141001', '143001', '144001', '110001', '411001', '560001'])[c],
        'country', 'IN',
        'phone', '+91 9' || lpad((floor(random() * 1000000000))::text, 9, '0'),
        'delivery_instructions', (ARRAY['Leave at the front door', 'Call before delivery', 'Hand over to security guard', 'Deliver after 6 PM'])[floor(random() * 4) + 1]
    ),
    repeat('Order handling notes and audit trail text. ', 5),
    NOW() - (random() * interval '180 days')
FROM (
    SELECT g, (g % 8) + 1 AS c   -- one city index per row, so city/state/zip always match
    FROM generate_series(1, 2000000) AS g
) s;

-- 4. Seed 2,000,000 Order Line Items
INSERT INTO order_items (order_id, product_id, quantity, unit_price)
SELECT 
    g,
    (floor(random() * 10000) + 1)::bigint,
    (floor(random() * 4) + 1)::int,
    ROUND((random() * 250 + 10)::numeric, 2)
FROM generate_series(1, 2000000) AS g;

-- VACUUM (not just ANALYZE) sets the visibility map, which Index-Only Scans depend on
VACUUM ANALYZE;