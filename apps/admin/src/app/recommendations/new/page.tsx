import { upsertRecommendation } from "@/lib/actions/recommendations";
import { redirect } from "next/navigation";
import RecommendationForm from "../RecommendationForm";

function parseNum(v: FormDataEntryValue | null): number | null {
  if (!v || v === "") return null;
  return Number(v);
}

async function action(_prev: unknown, formData: FormData) {
  "use server";
  try {
    await upsertRecommendation({
      user_id: formData.get("user_id") as string,
      product_id: formData.get("product_id") as string,
      date: formData.get("date") as string,
      score: parseNum(formData.get("score")),
    });
  } catch (e) {
    return { error: String(e) };
  }
  redirect("/recommendations");
}

export default function NewRecommendationPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">
        Recommendation - 新規作成 (UPSERT)
      </h2>
      <RecommendationForm action={action} submitLabel="作成" />
    </div>
  );
}
