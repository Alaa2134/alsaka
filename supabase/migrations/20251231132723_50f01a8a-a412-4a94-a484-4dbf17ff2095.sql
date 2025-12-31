-- Drop the unique constraint temporarily
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_item_number_key;

-- Swap the values using a temporary column
ALTER TABLE products ADD COLUMN temp_name TEXT;

UPDATE products SET temp_name = item_number;
UPDATE products SET item_number = name;
UPDATE products SET name = temp_name;

ALTER TABLE products DROP COLUMN temp_name;