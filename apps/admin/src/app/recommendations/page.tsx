import {
  getRecommendations,
  deleteRecommendation,
} from "@/lib/actions/recommendations";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function handleDelete(formData: FormData) {
  "use server";
  const userId = formData.get("user_id") as string;
  await deleteRecommendation(userId);
  redirect("/recommendations");
}

export default async function RecommendationsPage() {
  const recommendations = await getRecommendations();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Recommendations</h2>
        <Link
          href="/recommendations/new"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          + 新規作成
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full bg-white rounded-lg shadow text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-3">user_id (PK)</th>
              <th className="p-3">product_id</th>
              <th className="p-3">date</th>
              <th className="p-3">score</th>
              <th className="p-3">created_at</th>
              <th className="p-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {recommendations.map((r) => (
              <tr key={r.user_id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-mono text-xs">{r.user_id}</td>
                <td className="p-3 font-mono text-xs">{r.product_id}</td>
                <td className="p-3">{r.date}</td>
                <td className="p-3 text-right">{r.score}</td>
                <td className="p-3 text-xs">{r.created_at}</td>
                <td className="p-3 flex gap-2">
                  <Link
                    href={`/recommendations/${encodeURIComponent(r.user_id)}/edit`}
                    className="text-blue-600 hover:underline"
                  >
                    編集
                  </Link>
                  <form action={handleDelete}>
                    <input type="hidden" name="user_id" value={r.user_id} />
                    <button
                      type="submit"
                      className="text-red-600 hover:underline"
                    >
                      削除
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {recommendations.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-400">
                  データがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
