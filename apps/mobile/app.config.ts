import { ExpoConfig, ConfigContext } from "expo/config";

const getApiUrl = (): string => {
  // Priority: explicit env var > default to local
  if (process.env.API_URL) {
    return process.env.API_URL;
  }
  // Default: docker-compose api-gateway on localhost
  return "http://localhost:8080/v1";
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "コンビニナビ",
  slug: "konbini-navi",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  scheme: "konbini-navi",
  splash: {
    backgroundColor: "#4CAF50",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.konbininavi.app",
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#4CAF50",
    },
    package: "com.konbininavi.app",
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  plugins: ["expo-router"],
  extra: {
    apiUrl: getApiUrl(),
    cognitoUserPoolId: process.env.COGNITO_USER_POOL_ID ?? "",
    cognitoClientId: process.env.COGNITO_CLIENT_ID ?? "",
    cognitoRegion: process.env.COGNITO_REGION ?? "ap-northeast-1",
    router: {
      origin: false,
    },
  },
});
