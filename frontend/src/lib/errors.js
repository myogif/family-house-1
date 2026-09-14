export function errorMessage(error) {
  if (!error) return "Terjadi kesalahan";
  if (typeof error === "string") return error;

  const detail = error?.response?.data?.detail ?? error?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => (typeof e === "string" ? e : e?.msg || e?.message || ""))
      .filter(Boolean)
      .join(" ");
  }

  const message =
    error?.message ||
    error?.error_description ||
    error?.response?.data?.message;

  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }

  return "Terjadi kesalahan";
}

export const apiError = errorMessage;
