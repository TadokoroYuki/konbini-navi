import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Konbini Navi Admin",
  description: "PostgreSQL CRUD管理画面",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 min-h-screen">
        <nav className="bg-green-600 text-white px-6 py-3 flex items-center gap-6">
          <h1 className="text-lg font-bold">Konbini Navi Admin</h1>
          <a href="/" className="hover:underline">
            Home
          </a>
          <a href="/products" className="hover:underline">
            Products
          </a>
          <a href="/records" className="hover:underline">
            Records
          </a>
          <a href="/recommendations" className="hover:underline">
            Recommendations
          </a>
        </nav>
        <main className="max-w-7xl mx-auto p-6">{children}</main>
      </body>
    </html>
  );
}
