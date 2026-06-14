export const itemCategories = [
  "Garmin",
  "ホイール",
  "DHバー",
  "スマートトレーナー",
  "ウェットスーツ",
  "パワーメーター",
  "サイクルコンピューター",
  "その他"
] as const;

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
