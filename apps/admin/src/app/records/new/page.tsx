import { createRecord } from "@/lib/actions/records";
import { redirect } from "next/navigation";
import RecordForm from "../RecordForm";

async function action(_prev: unknown, formData: FormData) {
  "use server";
  try {
    await createRecord({
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

export default function NewRecordPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">Record - 新規作成</h2>
      <RecordForm action={action} submitLabel="作成" />
    </div>
  );
}
