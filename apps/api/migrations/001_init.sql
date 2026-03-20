-- Initialize Konbini Navi PostgreSQL schema

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(100),
  category VARCHAR(100),
  price INTEGER DEFAULT 0,
  calories NUMERIC(10, 2),
  protein NUMERIC(10, 2),
  fat NUMERIC(10, 2),
  carbs NUMERIC(10, 2),
  fiber NUMERIC(10, 2),
  salt NUMERIC(10, 2),
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Records table
CREATE TABLE IF NOT EXISTS records (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  record_id VARCHAR(255) NOT NULL UNIQUE,
  product_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  meal_type VARCHAR(50) NOT NULL DEFAULT 'snack',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Create indices for common queries
CREATE INDEX IF NOT EXISTS idx_products_product_id ON products(product_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand_category ON products(brand, category);
CREATE INDEX IF NOT EXISTS idx_records_user_id ON records(user_id);
CREATE INDEX IF NOT EXISTS idx_records_date ON records(date);
CREATE INDEX IF NOT EXISTS idx_records_user_date ON records(user_id, date);
CREATE INDEX IF NOT EXISTS idx_records_record_id ON records(record_id);
