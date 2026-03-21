"use server";

import pool from "@/lib/db";

export type Recommendation = {
  user_id: string;
  product_id: string;
  date: string;
  score: number | null;
  created_at: string | null;
};

export async function getRecommendations(): Promise<Recommendation[]> {
  const { rows } = await pool.query(
    "SELECT * FROM recommendations ORDER BY created_at DESC"
  );
  return rows.map((r) => ({
    ...r,
    date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : r.date,
    created_at: r.created_at?.toISOString?.() ?? r.created_at,
  }));
}

export async function getRecommendation(
  userId: string
): Promise<Recommendation | null> {
  const { rows } = await pool.query(
    "SELECT * FROM recommendations WHERE user_id = $1",
    [userId]
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    ...r,
    date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : r.date,
    created_at: r.created_at?.toISOString?.() ?? r.created_at,
  };
}

export async function upsertRecommendation(
  data: Omit<Recommendation, "created_at">
): Promise<Recommendation> {
  const { rows } = await pool.query(
    `INSERT INTO recommendations (user_id, product_id, date, score)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE SET
       product_id = EXCLUDED.product_id,
       date = EXCLUDED.date,
       score = EXCLUDED.score,
       created_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [data.user_id, data.product_id, data.date, data.score]
  );
  const r = rows[0];
  return {
    ...r,
    date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : r.date,
    created_at: r.created_at?.toISOString?.() ?? r.created_at,
  };
}

export async function deleteRecommendation(userId: string): Promise<void> {
  await pool.query("DELETE FROM recommendations WHERE user_id = $1", [userId]);
}
