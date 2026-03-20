import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">
        PostgreSQL 管理画面
      </h2>
      <p className="text-gray-600">テーブルを選択してCRUD操作を行います。</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/products"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition"
        >
          <h3 className="text-xl font-semibold text-green-700">Products</h3>
          <p className="text-gray-500 mt-2">
            商品マスタ (name, brand, category, price, 栄養素...)
          </p>
        </Link>
        <Link
          href="/records"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition"
        >
          <h3 className="text-xl font-semibold text-green-700">Records</h3>
          <p className="text-gray-500 mt-2">
            食事記録 (user_id, product_id, date, meal_type)
          </p>
        </Link>
      </div>
    </div>
  );
}
