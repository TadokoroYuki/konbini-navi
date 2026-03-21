"use client";

import { useActionState } from "react";

type Props = {
  action: (prev: unknown, formData: FormData) => Promise<{ error?: string }>;
  defaultValues?: {
    user_id?: string;
    product_id?: string;
    date?: string;
    score?: number | null;
  };
  submitLabel: string;
  userIdReadOnly?: boolean;
};

export default function RecommendationForm({
  action,
  defaultValues = {},
  submitLabel,
  userIdReadOnly,
}: Props) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4 max-w-lg">
      {state?.error && (
        <div className="bg-red-100 text-red-700 p-3 rounded">
          {state.error}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          user_id
        </label>
        <input
          name="user_id"
          required
          defaultValue={defaultValues.user_id ?? ""}
          readOnly={userIdReadOnly}
          className={`w-full border rounded p-2 ${userIdReadOnly ? "bg-gray-100" : ""}`}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          product_id
        </label>
        <input
          name="product_id"
          required
          defaultValue={defaultValues.product_id ?? ""}
          className="w-full border rounded p-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          date
        </label>
        <input
          type="date"
          name="date"
          required
          defaultValue={defaultValues.date ?? ""}
          className="w-full border rounded p-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          score
        </label>
        <input
          type="number"
          name="score"
          step="0.01"
          defaultValue={defaultValues.score ?? ""}
          className="w-full border rounded p-2"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
      >
        {pending ? "保存中..." : submitLabel}
      </button>
    </form>
  );
}
