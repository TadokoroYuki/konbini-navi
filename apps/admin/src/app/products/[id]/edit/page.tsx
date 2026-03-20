import { getProduct, updateProduct } from "@/lib/actions/products";
import { redirect, notFound } from "next/navigation";
import ProductForm from "../../ProductForm";

function parseNum(v: FormDataEntryValue | null): number | null {
  if (!v || v === "") return null;
  return Number(v);
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  const product = await getProduct(id);
  if (!product) notFound();

  async function action(_prev: unknown, formData: FormData) {
    "use server";
    try {
      await updateProduct(id, {
        product_id: formData.get("product_id") as string,
        name: formData.get("name") as string,
        brand: (formData.get("brand") as string) || null,
        category: (formData.get("category") as string) || null,
        price: parseNum(formData.get("price")),
        calories: parseNum(formData.get("calories")),
        protein: parseNum(formData.get("protein")),
        fat: parseNum(formData.get("fat")),
        carbs: parseNum(formData.get("carbs")),
        fiber: parseNum(formData.get("fiber")),
        salt: parseNum(formData.get("salt")),
        image_url: (formData.get("image_url") as string) || null,
        description: (formData.get("description") as string) || null,
      });
    } catch (e) {
      return { error: String(e) };
    }
    redirect("/products");
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">Product - 編集 (ID: {id})</h2>
      <ProductForm action={action} defaultValues={product} submitLabel="更新" />
    </div>
  );
}
