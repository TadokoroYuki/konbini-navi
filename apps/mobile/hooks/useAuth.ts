import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { setAuthToken } from "../lib/api-client";

const AUTH_TOKEN_KEY = "@konbini_navi_auth_token";
const AUTH_USER_KEY = "@konbini_navi_auth_user";

const AUTH_URL: string =
  Constants.expoConfig?.extra?.authUrl ?? "http://localhost:4000";

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface UseAuthReturn {
  user: AuthUser | null;
  token: string | null;
  deviceId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(AUTH_TOKEN_KEY),
          AsyncStorage.getItem(AUTH_USER_KEY),
        ]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          setAuthToken(storedToken);
        }
      } catch {
        // Session restore failed, user will need to log in
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${AUTH_URL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      throw new Error("ログインに失敗しました");
    }

    const data = await res.json();
    const authToken = data.token;
    const authUser: AuthUser = {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
    };

    await Promise.all([
      AsyncStorage.setItem(AUTH_TOKEN_KEY, authToken),
      AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(authUser)),
    ]);

    setToken(authToken);
    setUser(authUser);
    setAuthToken(authToken);
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await fetch(`${AUTH_URL}/api/auth/sign-up/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        throw new Error("登録に失敗しました");
      }

      const data = await res.json();
      const authToken = data.token;
      const authUser: AuthUser = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
      };

      await Promise.all([
        AsyncStorage.setItem(AUTH_TOKEN_KEY, authToken),
        AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(authUser)),
      ]);

      setToken(authToken);
      setUser(authUser);
      setAuthToken(authToken);
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      if (token) {
        await fetch(`${AUTH_URL}/api/auth/sign-out`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Sign out from server failed, still clear local state
    }

    await Promise.all([
      AsyncStorage.removeItem(AUTH_TOKEN_KEY),
      AsyncStorage.removeItem(AUTH_USER_KEY),
    ]);

    setToken(null);
    setUser(null);
    setAuthToken(null);
  }, [token]);

  return {
    user,
    token,
    deviceId: user?.id ?? null,
    isLoading,
    isAuthenticated: !!token && !!user,
    signIn,
    signUp,
    signOut,
  };
};
