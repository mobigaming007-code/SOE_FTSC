export function formatNumber(value: number | string | undefined | null) {
  const num = Number(value || 0);

  return new Intl.NumberFormat("vi-VN").format(num);
}

export function formatCurrency(value: number | string | undefined | null) {
  const num = Number(value || 0);

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(num);
}

export function getCurrentMonth() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${now.getFullYear()}-${month}`;
}