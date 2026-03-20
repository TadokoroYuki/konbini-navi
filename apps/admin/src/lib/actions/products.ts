"use server";

import pool from "@/lib/db";

export type Product = {
  id: number;
  product_id: string;
  name: string;
  brand: string | null;
  category: string | null;
  price: number | null;
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  fiber: number | null;
  salt: number | null;
  image_url: string | null;
  description: string | null;
  created_at: string | null;
};

export async function getProducts(): Promise<Product[]> {
  const { rows } = await pool.query(
    "SELECT * FROM products ORDER BY id DESC"
  );
  return rows.map((r) => ({ ...r, created_at: r.created_at?.toISOString?.() ?? r.created_at }));
}

export async function getProduct(id: number): Promise<Product | null> {
  const { rows } = await pool.query("SELECT * FROM products WHERE id = $1", [
    id,
  ]);
  if (rows.length === 0) return null;
  const r = rows[0];
  return { ...r, created_at: r.created_at?.toISOString?.() ?? r.created_at };
}

export async function createProduct(
  data: Omit<Product, "id" | "created_at">
): Promise<Product> {
  const { rows } = await pool.query(
    `INSERT INTO products (product_id, name, brand, category, price, calories, protein, fat, carbs, fiber, salt, image_url, description)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      data.product_id,
      data.name,
      data.brand,
      data.category,
      data.price,
      data.calories,
      data.protein,
      data.fat,
      data.carbs,
      data.fiber,
      data.salt,
      data.image_url,
      data.description,
    ]
  );
  const r = rows[0];
  return { ...r, created_at: r.created_at?.toISOString?.() ?? r.created_at };
}

export async function updateProduct(
  id: number,
  data: Omit<Product, "id" | "created_at">
): Promise<Product> {
  const { rows } = await pool.query(
    `UPDATE products SET
       product_id=$1, name=$2, brand=$3, category=$4, price=$5,
       calories=$6, protein=$7, fat=$8, carbs=$9, fiber=$10,
       salt=$11, image_url=$12, description=$13
     WHERE id=$14 RETURNING *`,
    [
      data.product_id,
      data.name,
      data.brand,
      data.category,
      data.price,
      data.calories,
      data.protein,
      data.fat,
      data.carbs,
      data.fiber,
      data.salt,
      data.image_url,
      data.description,
      id,
    ]
  );
  const r = rows[0];
  return { ...r, created_at: r.created_at?.toISOString?.() ?? r.created_at };
}

export async function deleteProduct(id: number): Promise<void> {
  await pool.query("DELETE FROM products WHERE id = $1", [id]);
}
