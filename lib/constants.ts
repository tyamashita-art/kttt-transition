export const gearCategoryGroups = {
  "スイム": ["ウェットスーツ", "ゴーグル・キャップ", "練習道具", "その他"],
  "バイク": ["バイク本体", "ヘルメット・シューズ", "パーツ・ホイール", "小物", "その他"],
  "ラン": ["シューズ", "ウェア・帽子", "小物", "その他"],
  "ウェア": ["トライスーツ", "サイクルウェア", "ランウェア", "チームウェア", "その他"],
  "ガジェット": ["時計", "サイクルコンピューター", "センサー類", "その他"],
  "補給・ケア": ["補給食", "ボトル", "ケア用品", "その他"],
  "バッグ・遠征": ["トランジションバッグ", "バイクケース", "遠征バッグ", "その他"],
  "工具・メンテ": ["工具", "空気入れ", "オイル・洗浄", "その他"],
  "その他": ["その他"]
} as const;

export const gearCategoryGroupNames = Object.keys(gearCategoryGroups) as Array<keyof typeof gearCategoryGroups>;

export function getGearCategoryItems(group?: string | null) {
  if (group && group in gearCategoryGroups) {
    return gearCategoryGroups[group as keyof typeof gearCategoryGroups];
  }
  return gearCategoryGroups["その他"];
}

export const itemCategories = Array.from(new Set(Object.values(gearCategoryGroups).flat())) as string[];

export const transportMethods = [
  "所有者が持参",
  "借り手が受け取り",
  "練習会で受け渡し",
  "レース会場で受け渡し",
  "要相談"
] as const;

export const itemStatusLabels: Record<string, string> = {
  available: "貸出可",
  requested: "申請中",
  borrowed: "貸出中",
  unavailable: "停止中"
};

export const itemStatusOptions = [
  { value: "available", label: "貸出可" },
  { value: "requested", label: "申請中" },
  { value: "borrowed", label: "貸出中" },
  { value: "unavailable", label: "貸出停止" }
] as const;

export const itemRegistrationStatusOptions = [
  { value: "available", label: "貸出可" },
  { value: "unavailable", label: "貸出停止" }
] as const;

export const availableTypeLabels: Record<string, string> = {
  anytime: "いつでも",
  period: "期間指定"
};

export const availableTypeOptions = [
  { value: "anytime", label: "いつでも" },
  { value: "period", label: "期間指定" }
] as const;

export const maxRentalMonthOptions = [
  { value: "1", label: "1ヶ月" },
  { value: "3", label: "3ヶ月" },
  { value: "6", label: "6ヶ月" }
] as const;

export const rentalStatusLabels: Record<string, string> = {
  requested: "承認待ち",
  rejected: "却下",
  borrowed: "貸出中",
  return_requested: "返却確認待ち",
  returned: "返却済み",
  overdue: "期限超過",
  cancelled: "キャンセル"
};

export const participantStatusLabels: Record<string, string> = {
  going: "参加",
  maybe: "未定",
  not_going: "不参加"
};

export const gearRequestStatusLabels: Record<string, string> = {
  open: "募集中",
  resolved: "解決済み"
};
