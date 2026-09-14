import { errorMessage, apiError } from "./errors";

export { errorMessage, apiError };

const api = Object.freeze({
  get: () => Promise.reject(new Error("Legacy REST API is deprecated. Use Supabase client.")),
  post: () => Promise.reject(new Error("Legacy REST API is deprecated. Use Supabase client.")),
  put: () => Promise.reject(new Error("Legacy REST API is deprecated. Use Supabase client.")),
  patch: () => Promise.reject(new Error("Legacy REST API is deprecated. Use Supabase client.")),
  delete: () => Promise.reject(new Error("Legacy REST API is deprecated. Use Supabase client.")),
});

export default api;
