"use client";

import { useActionState } from "react";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

type Props = {
  action: (prev: unknown, formData: FormData) => Promise<{ error?: string }>;
  defaultValues?: {
    user_id?: string;
    record_id?: string;
    product_id?: string;
    date?: string;
    meal_type?: string;
  };
  submitLabel: string;
  showRecordId?: boolean;
};

export default function RecordForm({
  action,
  defaultValues = {},
  submitLabel,
  showRecordId = false,
}: Props) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4 max-w-lg">
      {state?.error && (
        <div className="bg-red-100 text-red-700 p-3 rounded">{state.error}</div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">user_id</label>
        <input
          name="user_id"
          required
          defaultValue={defaultValues.user_id ?? ""}
          className="w-full border rounded p-2"
        />
      </div>
      {showRecordId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">record_id</label>
          <input
            name="record_id"
            required
            defaultValue={defaultValues.record_id ?? ""}
            className="w-full border rounded p-2"
          />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">product_id</label>
        <input
          name="product_id"
          required
          defaultValue={defaultValues.product_id ?? ""}
          className="w-full border rounded p-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">date</label>
        <input
          type="date"
          name="date"
          required
          defaultValue={defaultValues.date ?? ""}
          className="w-full border rounded p-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">meal_type</label>
        <select
          name="meal_type"
          required
          defaultValue={defaultValues.meal_type ?? "snack"}
          className="w-full border rounded p-2"
        >
          {MEAL_TYPES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
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
