"use client";

import { Loader2, PackagePlus, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  availableTypeOptions,
  gearCategoryGroupNames,
  getGearCategoryItems,
  itemRegistrationStatusOptions,
  maxRentalMonthOptions,
  transportMethods
} from "@/lib/constants";
import { uploadPublicImage } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

export default function NewGearPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [categoryGroup, setCategoryGroup] = useState<string>("スイム");
  const [categoryItem, setCategoryItem] = useState<string>("ウェットスーツ");
  const [availableType, setAvailableType] = useState("anytime");
  const [isLendable, setIsLendable] = useState(true);
  const [isSellable, setIsSellable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setUserId(data.user?.id || null));
  }, []);

  function onImageChange(file?: File) {
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;
    setSaving(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const supabase = createClient();
    const lendable = formData.get("is_lendable") === "on";
    const sellable = formData.get("is_sellable") === "on";
    const salePriceValue = String(formData.get("sale_price") || "").trim();

    if (!lendable && !sellable) {
      setError("貸出可または販売可を少なくとも1つ選んでください。");
      setSaving(false);
      return;
    }

    try {
      const imageUrl = imageFile
        ? await uploadPublicImage({ bucket: "item-images", userId, file: imageFile })
        : null;

      const { error: insertError } = await supabase
        .from("items")
        .insert({
          owner_id: userId,
          name: String(formData.get("name") || ""),
          category: categoryItem,
          category_group: categoryGroup,
          category_item: categoryItem,
          image_url: imageUrl,
          description: String(formData.get("description") || ""),
          condition: String(formData.get("condition") || ""),
          status: lendable ? (String(formData.get("status") || "available") as "available") : "unavailable",
          is_lendable: lendable,
          is_sellable: sellable,
          sale_price: sellable && salePriceValue ? Number(salePriceValue) : null,
          available_type: availableType as "anytime" | "period",
          available_from: String(formData.get("available_from") || "") || null,
          available_until: String(formData.get("available_until") || "") || null,
          max_rental_months: Number(formData.get("max_rental_months") || 6),
          transport_method: String(formData.get("transport_method") || "要相談"),
          transport_note: String(formData.get("transport_note") || "")
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      router.replace("/gear?created=1");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "登録に失敗しました。");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <section>
        <h2 className="text-2xl font-black">ギア登録</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">最大貸出期間は6ヶ月までです。</p>
      </section>

      <form onSubmit={onSubmit} className="space-y-4">
        <ImagePicker preview={imagePreview} onChange={onImageChange} />
        <TextInput name="name" label="ギア名" required />
        <div className="grid grid-cols-2 gap-3">
          <Select
            name="category_group"
            label="大カテゴリ"
            values={gearCategoryGroupNames}
            value={categoryGroup}
            onChange={(value) => {
              const nextItem = getGearCategoryItems(value)[0];
              setCategoryGroup(value);
              setCategoryItem(nextItem);
            }}
          />
          <Select
            name="category_item"
            label="小カテゴリ"
            values={getGearCategoryItems(categoryGroup)}
            value={categoryItem}
            onChange={setCategoryItem}
          />
        </div>
        <TextArea name="description" label="説明" rows={4} />
        <TextArea name="condition" label="状態" rows={3} />

        <section className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-black">掲載タイプ</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <CheckOption
              name="is_lendable"
              label="貸出可"
              checked={isLendable}
              onChange={setIsLendable}
            />
            <CheckOption
              name="is_sellable"
              label="販売可"
              checked={isSellable}
              onChange={setIsSellable}
            />
          </div>
        </section>

        {isSellable ? <TextInput name="sale_price" label="販売価格（円）" type="number" /> : null}

        <OptionSelect name="status" label="貸出ステータス" options={itemRegistrationStatusOptions} />

        <label className="block text-sm font-black">
          貸出可能タイプ
          <select
            value={availableType}
            name="available_type"
            onChange={(event) => setAvailableType(event.target.value)}
            className="mt-2 h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-base outline-none ring-accent focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
          >
            {availableTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {availableType === "period" ? (
          <div className="grid grid-cols-2 gap-3">
            <TextInput name="available_from" label="開始日" type="date" required />
            <TextInput name="available_until" label="終了日" type="date" required />
          </div>
        ) : null}

        <label className="block text-sm font-black">
          最大貸出期間
          <select
            name="max_rental_months"
            defaultValue={6}
            className="mt-2 h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-base outline-none ring-accent focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
          >
            {maxRentalMonthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <Select name="transport_method" label="受け渡し方法" values={transportMethods} />
        <TextArea name="transport_note" label="受け渡し備考" rows={3} />

        {error ? (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-200">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-slate-900 font-black text-white active:scale-[0.99] disabled:opacity-60 dark:bg-red-500 dark:text-white"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <PackagePlus size={18} />}
          登録する
        </button>
      </form>
    </div>
  );
}

function ImagePicker({
  preview,
  onChange
}: {
  preview: string | null;
  onChange: (file?: File) => void;
}) {
  return (
    <label className="block cursor-pointer overflow-hidden rounded-md border border-dashed border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="grid aspect-[4/3] place-items-center bg-slate-100 dark:bg-slate-800">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="ギア写真プレビュー" className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-sm font-black text-slate-500">
            <Upload size={24} />
            写真を選択
          </div>
        )}
      </div>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => onChange(event.target.files?.[0])}
      />
    </label>
  );
}

function TextInput({
  label,
  name,
  type = "text",
  required
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-black">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        className="mt-2 h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-base outline-none ring-accent focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  rows
}: {
  label: string;
  name: string;
  rows: number;
}) {
  return (
    <label className="block text-sm font-black">
      {label}
      <textarea
        name={name}
        rows={rows}
        className="mt-2 w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-3 text-base leading-6 outline-none ring-accent focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
      />
    </label>
  );
}

function Select({
  label,
  name,
  values,
  value,
  defaultValue,
  onChange
}: {
  label: string;
  name: string;
  values: readonly string[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-black">
      {label}
      <select
        name={name}
        value={value}
        defaultValue={defaultValue}
        onChange={(event) => onChange?.(event.target.value)}
        className="mt-2 h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-base outline-none ring-accent focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
      >
        {values.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckOption({
  name,
  label,
  checked,
  onChange
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex h-12 items-center justify-center rounded-md text-sm font-black ring-1 transition ${
        checked
          ? "bg-slate-900 text-white ring-slate-900 dark:bg-red-500 dark:ring-red-500"
          : "bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-800"
      }`}
    >
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only"
      />
      {label}
    </label>
  );
}

function OptionSelect({
  label,
  name,
  options
}: {
  label: string;
  name: string;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <label className="block text-sm font-black">
      {label}
      <select
        name={name}
        className="mt-2 h-12 w-full rounded-md border border-slate-200 bg-white px-3 text-base outline-none ring-accent focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
