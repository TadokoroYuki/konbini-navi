import { getRecords, deleteRecord } from "@/lib/actions/records";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function handleDelete(formData: FormData) {
  "use server";
  const id = Number(formData.get("id"));
  await deleteRecord(id);
  redirect("/records");
}

export default async function RecordsPage() {
  const records = await getRecords();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Records</h2>
        <Link
          href="/records/new"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          + 新規作成
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full bg-white rounded-lg shadow text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-3">ID</th>
              <th className="p-3">record_id</th>
              <th className="p-3">user_id</th>
              <th className="p-3">product_id</th>
              <th className="p-3">date</th>
              <th className="p-3">meal_type</th>
              <th className="p-3">created_at</th>
              <th className="p-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="p-3">{r.id}</td>
                <td className="p-3 font-mono text-xs">{r.record_id}</td>
                <td className="p-3 font-mono text-xs">{r.user_id}</td>
                <td className="p-3 font-mono text-xs">{r.product_id}</td>
                <td className="p-3">{r.date}</td>
                <td className="p-3">{r.meal_type}</td>
                <td className="p-3 text-xs">{r.created_at}</td>
                <td className="p-3 flex gap-2">
                  <Link
                    href={`/records/${r.id}/edit`}
                    className="text-blue-600 hover:underline"
                  >
                    編集
                  </Link>
                  <form action={handleDelete}>
                    <input type="hidden" name="id" value={r.id} />
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
            {records.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-gray-400">
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
