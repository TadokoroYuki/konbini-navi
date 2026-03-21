import {
  getRecommendation,
  upsertRecommendation,
} from "@/lib/actions/recommendations";
import { redirect, notFound } from "next/navigation";
import RecommendationForm from "../../RecommendationForm";

function parseNum(v: FormDataEntryValue | null): number | null {
  if (!v || v === "") return null;
  return Number(v);
}

export default async function EditRecommendationPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const decoded = decodeURIComponent(userId);
  const recommendation = await getRecommendation(decoded);
  if (!recommendation) notFound();

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

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">
        Recommendation - 編集 ({decoded})
      </h2>
      <RecommendationForm
        action={action}
        defaultValues={recommendation}
        submitLabel="更新"
        userIdReadOnly
      />
    </div>
  );
}
