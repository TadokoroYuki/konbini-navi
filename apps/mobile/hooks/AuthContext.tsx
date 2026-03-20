import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { setAuthToken } from "../lib/api-client";

const USER_POOL_ID =
  Constants.expoConfig?.extra?.cognitoUserPoolId ?? "";
const CLIENT_ID =
  Constants.expoConfig?.extra?.cognitoClientId ?? "";
const REGION =
  Constants.expoConfig?.extra?.cognitoRegion ?? "us-east-1";

const COGNITO_URL = `https://cognito-idp.${REGION}.amazonaws.com/`;

const TOKEN_KEY = "@konbini_navi_tokens";
const USER_KEY = "@konbini_navi_user";

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  deviceId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const cognitoRequest = async (action: string, params: Record<string, unknown>) => {
  const res = await fetch(COGNITO_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": `AWSCognitoIdentityProviderService.${action}`,
    },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.__type || "Cognito request failed");
  }
  return data;
};

const decodeJwtPayload = (token: string): Record<string, unknown> => {
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(base64));
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [storedTokens, storedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);

        if (storedTokens && storedUser) {
          const tokens = JSON.parse(storedTokens);
          const userData = JSON.parse(storedUser);

          try {
            const refreshed = await cognitoRequest("InitiateAuth", {
              AuthFlow: "REFRESH_TOKEN_AUTH",
              ClientId: CLIENT_ID,
              AuthParameters: {
                REFRESH_TOKEN: tokens.refreshToken,
              },
            });

            const idToken = refreshed.AuthenticationResult.IdToken;
            await AsyncStorage.setItem(
              TOKEN_KEY,
              JSON.stringify({
                ...tokens,
                idToken,
                accessToken: refreshed.AuthenticationResult.AccessToken,
              })
            );

            setToken(idToken);
            setUser(userData);
            setAuthToken(idToken);
          } catch {
            await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
          }
        }
      } catch {
        // Session restore failed
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await cognitoRequest("InitiateAuth", {
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const authResult = result.AuthenticationResult;
    const idToken = authResult.IdToken as string;
    const payload = decodeJwtPayload(idToken);

    const userData: AuthUser = {
      id: payload.sub as string,
      name: (payload.name as string) ?? "",
      email: (payload.email as string) ?? email,
    };

    await Promise.all([
      AsyncStorage.setItem(
        TOKEN_KEY,
        JSON.stringify({
          idToken,
          accessToken: authResult.AccessToken,
          refreshToken: authResult.RefreshToken,
        })
      ),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(userData)),
    ]);

    setToken(idToken);
    setUser(userData);
    setAuthToken(idToken);
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      await cognitoRequest("SignUp", {
        ClientId: CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "name", Value: name },
        ],
      });

      await signIn(email, password);
    },
    [signIn]
  );

  const signOut = useCallback(async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    setToken(null);
    setUser(null);
    setAuthToken(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        deviceId: user?.id ?? null,
        isLoading,
        isAuthenticated: !!token && !!user,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
