"use server";

import pool from "@/lib/db";

export type Record = {
  id: number;
  user_id: string;
  record_id: string;
  product_id: string;
  date: string;
  meal_type: string;
  created_at: string | null;
};

export async function getRecords(): Promise<Record[]> {
  const { rows } = await pool.query(
    "SELECT * FROM records ORDER BY id DESC"
  );
  return rows.map((r) => ({
    ...r,
    date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : r.date,
    created_at: r.created_at?.toISOString?.() ?? r.created_at,
  }));
}

export async function getRecord(id: number): Promise<Record | null> {
  const { rows } = await pool.query("SELECT * FROM records WHERE id = $1", [
    id,
  ]);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    ...r,
    date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : r.date,
    created_at: r.created_at?.toISOString?.() ?? r.created_at,
  };
}

export async function createRecord(
  data: Omit<Record, "id" | "created_at">
): Promise<Record> {
  const { rows } = await pool.query(
    `INSERT INTO records (user_id, record_id, product_id, date, meal_type)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [data.user_id, data.record_id, data.product_id, data.date, data.meal_type]
  );
  const r = rows[0];
  return {
    ...r,
    date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : r.date,
    created_at: r.created_at?.toISOString?.() ?? r.created_at,
  };
}

export async function updateRecord(
  id: number,
  data: Omit<Record, "id" | "created_at">
): Promise<Record> {
  const { rows } = await pool.query(
    `UPDATE records SET
       user_id=$1, record_id=$2, product_id=$3, date=$4, meal_type=$5
     WHERE id=$6 RETURNING *`,
    [data.user_id, data.record_id, data.product_id, data.date, data.meal_type, id]
  );
  const r = rows[0];
  return {
    ...r,
    date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : r.date,
    created_at: r.created_at?.toISOString?.() ?? r.created_at,
  };
}

export async function deleteRecord(id: number): Promise<void> {
  await pool.query("DELETE FROM records WHERE id = $1", [id]);
}
