import { useEffect, useState, useCallback } from "react";
import { fetchResource } from "@/lib/data/resources";
import { fetchDashboard } from "@/lib/data/dashboard";

// Fetches a family-scoped (or any) resource. Re-fetches when path changes.
export function useResource(path, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      const result = path.match(/^\/families\/[^/]+\/dashboard$/)
        ? await fetchDashboard(path.split("/")[2])
        : await fetchResource(path);
      setData(result);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  useEffect(() => {
    if (path) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);

  return { data, loading, reload, setData };
}
