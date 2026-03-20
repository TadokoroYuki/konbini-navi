import { useState, useEffect, useCallback } from "react";
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  CognitoUserSession,
} from "amazon-cognito-identity-js";
import Constants from "expo-constants";
import { setAuthToken } from "../lib/api-client";

const USER_POOL_ID =
  Constants.expoConfig?.extra?.cognitoUserPoolId ?? "";
const CLIENT_ID =
  Constants.expoConfig?.extra?.cognitoClientId ?? "";

const userPool = new CognitoUserPool({
  UserPoolId: USER_POOL_ID,
  ClientId: CLIENT_ID,
});

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

const getSession = (cognitoUser: CognitoUser): Promise<CognitoUserSession> =>
  new Promise((resolve, reject) => {
    cognitoUser.getSession(
      (err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session) {
          reject(err ?? new Error("No session"));
          return;
        }
        resolve(session);
      }
    );
  });

const getUserAttributes = (
  cognitoUser: CognitoUser
): Promise<CognitoUserAttribute[]> =>
  new Promise((resolve, reject) => {
    cognitoUser.getUserAttributes((err, attrs) => {
      if (err || !attrs) {
        reject(err ?? new Error("No attributes"));
        return;
      }
      resolve(attrs);
    });
  });

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const cognitoUser = userPool.getCurrentUser();
        if (!cognitoUser) {
          setIsLoading(false);
          return;
        }

        const session = await getSession(cognitoUser);
        const idToken = session.getIdToken().getJwtToken();
        const attrs = await getUserAttributes(cognitoUser);

        const email =
          attrs.find((a) => a.getName() === "email")?.getValue() ?? "";
        const name =
          attrs.find((a) => a.getName() === "name")?.getValue() ?? "";
        const sub =
          attrs.find((a) => a.getName() === "sub")?.getValue() ?? "";

        setToken(idToken);
        setUser({ id: sub, name, email });
        setAuthToken(idToken);
      } catch {
        // Session expired or invalid
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });
    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    const session = await new Promise<CognitoUserSession>((resolve, reject) => {
      cognitoUser.authenticateUser(authDetails, {
        onSuccess: resolve,
        onFailure: reject,
      });
    });

    const idToken = session.getIdToken().getJwtToken();
    const attrs = await getUserAttributes(cognitoUser);

    const name =
      attrs.find((a) => a.getName() === "name")?.getValue() ?? "";
    const sub =
      attrs.find((a) => a.getName() === "sub")?.getValue() ?? "";

    setToken(idToken);
    setUser({ id: sub, name, email });
    setAuthToken(idToken);
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const attributes = [
        new CognitoUserAttribute({ Name: "email", Value: email }),
        new CognitoUserAttribute({ Name: "name", Value: name }),
      ];

      await new Promise<CognitoUser>((resolve, reject) => {
        userPool.signUp(email, password, attributes, [], (err, result) => {
          if (err || !result) {
            reject(err ?? new Error("Sign up failed"));
            return;
          }
          resolve(result.user);
        });
      });

      // Auto sign-in after signup (only works if auto-verify is enabled)
      await signIn(email, password);
    },
    [signIn]
  );

  const signOut = useCallback(async () => {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
      cognitoUser.signOut();
    }
    setToken(null);
    setUser(null);
    setAuthToken(null);
  }, []);

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
