import { getProducts, deleteProduct } from "@/lib/actions/products";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function handleDelete(formData: FormData) {
  "use server";
  const id = Number(formData.get("id"));
  await deleteProduct(id);
  redirect("/products");
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Products</h2>
        <Link
          href="/products/new"
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
              <th className="p-3">product_id</th>
              <th className="p-3">name</th>
              <th className="p-3">brand</th>
              <th className="p-3">category</th>
              <th className="p-3">price</th>
              <th className="p-3">cal</th>
              <th className="p-3">P</th>
              <th className="p-3">F</th>
              <th className="p-3">C</th>
              <th className="p-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="p-3">{p.id}</td>
                <td className="p-3 font-mono text-xs">{p.product_id}</td>
                <td className="p-3">{p.name}</td>
                <td className="p-3">{p.brand}</td>
                <td className="p-3">{p.category}</td>
                <td className="p-3 text-right">{p.price}</td>
                <td className="p-3 text-right">{p.calories}</td>
                <td className="p-3 text-right">{p.protein}</td>
                <td className="p-3 text-right">{p.fat}</td>
                <td className="p-3 text-right">{p.carbs}</td>
                <td className="p-3 flex gap-2">
                  <Link
                    href={`/products/${p.id}/edit`}
                    className="text-blue-600 hover:underline"
                  >
                    編集
                  </Link>
                  <form action={handleDelete}>
                    <input type="hidden" name="id" value={p.id} />
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
            {products.length === 0 && (
              <tr>
                <td colSpan={11} className="p-6 text-center text-gray-400">
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
