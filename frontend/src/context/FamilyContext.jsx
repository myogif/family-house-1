"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { listFamilies } from "@/lib/data/families";
import { useAuth } from "./AuthContext";

const FamilyContext = createContext(null);

export function FamilyProvider({ children }) {
  const { user } = useAuth();
  const [families, setFamilies] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listFamilies();
      setFamilies(data);
      setActiveId((prev) => {
        const stillValid = data.find((f) => f.id === prev);
        const next = stillValid ? prev : data[0]?.id || null;
        if (next) localStorage.setItem("kk_active_family", next);
        return next;
      });
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.id) refresh();
  }, [user, refresh]);

  const switchFamily = (id) => {
    setActiveId(id);
    localStorage.setItem("kk_active_family", id);
  };

  const activeFamily = families.find((f) => f.id === activeId) || null;

  return (
    <FamilyContext.Provider
      value={{ families, activeFamily, activeId, switchFamily, refresh, loading }}
    >
      {children}
    </FamilyContext.Provider>
  );
}

export const useFamily = () => useContext(FamilyContext);
