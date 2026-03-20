import { getRecord, updateRecord } from "@/lib/actions/records";
import { redirect, notFound } from "next/navigation";
import RecordForm from "../../RecordForm";

export default async function EditRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  const record = await getRecord(id);
  if (!record) notFound();

  async function action(_prev: unknown, formData: FormData) {
    "use server";
    try {
      await updateRecord(id, {
        user_id: formData.get("user_id") as string,
        record_id: formData.get("record_id") as string,
        product_id: formData.get("product_id") as string,
        date: formData.get("date") as string,
        meal_type: formData.get("meal_type") as string,
      });
    } catch (e) {
      return { error: String(e) };
    }
    redirect("/records");
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">Record - 編集 (ID: {id})</h2>
      <RecordForm action={action} defaultValues={record} submitLabel="更新" />
    </div>
  );
}
