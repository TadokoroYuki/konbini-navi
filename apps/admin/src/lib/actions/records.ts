"use server";

import pool from "@/lib/db";

const RECORDS_API_URL =
  process.env.RECORDS_API_URL ?? "http://localhost:8810";

export type Record = {
  id: number;
  user_id: string;
  record_id: string;
  product_id: string;
  date: string;
  meal_type: string;
  created_at: string | null;
};

// 一覧・取得は直接SQL（records サービスの List API はユーザー単位のため）
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

// 作成は records サービス経由（recommendations 再計算がトリガーされる）
export async function createRecord(data: {
  user_id: string;
  product_id: string;
  date: string;
  meal_type: string;
}): Promise<void> {
  const url = `${RECORDS_API_URL}/v1/users/${encodeURIComponent(data.user_id)}/records`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productId: data.product_id,
      date: data.date,
      mealType: data.meal_type,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`records API error (${res.status}): ${body}`);
  }
}

// 更新は直接SQL + recommendations refresh を呼ぶ
export async function updateRecord(
  id: number,
  data: {
    user_id: string;
    record_id: string;
    product_id: string;
    date: string;
    meal_type: string;
  }
): Promise<Record> {
  const { rows } = await pool.query(
    `UPDATE records SET
       user_id=$1, record_id=$2, product_id=$3, date=$4, meal_type=$5
     WHERE id=$6 RETURNING *`,
    [data.user_id, data.record_id, data.product_id, data.date, data.meal_type, id]
  );
  const r = rows[0];

  // recommendations 再計算をトリガー
  const recomURL = process.env.RECOMMENDATIONS_API_URL ?? "http://localhost:2525";
  fetch(
    `${recomURL}/v1/users/${encodeURIComponent(data.user_id)}/recommendations/refresh`,
    { method: "POST" }
  ).catch((err) => console.error("Failed to refresh recommendation:", err));

  return {
    ...r,
    date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : r.date,
    created_at: r.created_at?.toISOString?.() ?? r.created_at,
  };
}

// 削除は records サービス経由（recommendations 再計算がトリガーされる）
export async function deleteRecord(id: number): Promise<void> {
  // まず record の user_id と record_id を取得
  const { rows } = await pool.query(
    "SELECT user_id, record_id FROM records WHERE id = $1",
    [id]
  );
  if (rows.length === 0) return;
  const { user_id, record_id } = rows[0];

  const url = `${RECORDS_API_URL}/v1/users/${encodeURIComponent(user_id)}/records/${encodeURIComponent(record_id)}`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`records API error (${res.status}): ${body}`);
  }
}
