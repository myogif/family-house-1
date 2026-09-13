export function errorMessage(error) {
  if (typeof error === "string") return error;
  if (error?.message) return error.message;
  return "Terjadi kesalahan";
}
