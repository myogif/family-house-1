"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

const AuthContext = createContext(null);

function toProfile(user) {
  if (!user) return false;
  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.name || user.email?.split("@")[0] || "Pengguna",
    avatar_url: user.user_metadata?.avatar_url || "",
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) throw error;
        setUser(toProfile(data.user));
      })
      .catch(() => {
        if (mounted) setUser(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(toProfile(session?.user));
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const nextUser = toProfile(data.user);
    setUser(nextUser);
    return nextUser;
  };

  const register = async (name, email, password) => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;
    const nextUser = toProfile(data.user);
    setUser(nextUser);
    return nextUser;
  };

  const logout = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
