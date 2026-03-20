"use client";

import { useActionState } from "react";

const BRANDS = ["", "seven_eleven", "family_mart", "lawson"] as const;
const CATEGORIES = [
  "",
  "onigiri",
  "bento",
  "sandwich",
  "salad",
  "soup",
  "noodle",
  "bread",
  "sweets",
  "drink",
  "side_dish",
] as const;

type Props = {
  action: (prev: unknown, formData: FormData) => Promise<{ error?: string }>;
  defaultValues?: {
    product_id?: string;
    name?: string;
    brand?: string;
    category?: string;
    price?: number | null;
    calories?: number | null;
    protein?: number | null;
    fat?: number | null;
    carbs?: number | null;
    fiber?: number | null;
    salt?: number | null;
    image_url?: string | null;
    description?: string | null;
  };
  submitLabel: string;
};

export default function ProductForm({
  action,
  defaultValues = {},
  submitLabel,
}: Props) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4 max-w-2xl">
      {state?.error && (
        <div className="bg-red-100 text-red-700 p-3 rounded">{state.error}</div>
      )}
      <Field label="product_id" name="product_id" required defaultValue={defaultValues.product_id ?? ""} />
      <Field label="name" name="name" required defaultValue={defaultValues.name ?? ""} />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">brand</label>
          <select name="brand" defaultValue={defaultValues.brand ?? ""} className="w-full border rounded p-2">
            {BRANDS.map((b) => (
              <option key={b} value={b}>{b || "(none)"}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">category</label>
          <select name="category" defaultValue={defaultValues.category ?? ""} className="w-full border rounded p-2">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c || "(none)"}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <NumField label="price" name="price" defaultValue={defaultValues.price} />
        <NumField label="calories" name="calories" defaultValue={defaultValues.calories} step="0.01" />
        <NumField label="protein" name="protein" defaultValue={defaultValues.protein} step="0.01" />
        <NumField label="fat" name="fat" defaultValue={defaultValues.fat} step="0.01" />
        <NumField label="carbs" name="carbs" defaultValue={defaultValues.carbs} step="0.01" />
        <NumField label="fiber" name="fiber" defaultValue={defaultValues.fiber} step="0.01" />
        <NumField label="salt" name="salt" defaultValue={defaultValues.salt} step="0.01" />
      </div>
      <Field label="image_url" name="image_url" defaultValue={defaultValues.image_url ?? ""} />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">description</label>
        <textarea
          name="description"
          defaultValue={defaultValues.description ?? ""}
          rows={3}
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

function Field({
  label,
  name,
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="w-full border rounded p-2"
      />
    </div>
  );
}

function NumField({
  label,
  name,
  defaultValue,
  step = "1",
}: {
  label: string;
  name: string;
  defaultValue?: number | null;
  step?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="number"
        name={name}
        step={step}
        defaultValue={defaultValue ?? ""}
        className="w-full border rounded p-2"
      />
    </div>
  );
}
