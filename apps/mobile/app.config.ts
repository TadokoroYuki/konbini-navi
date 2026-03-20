import { ExpoConfig, ConfigContext } from "expo/config";

const IS_DEV = process.env.APP_VARIANT === "development";

const getApiUrl = (): string => {
  if (process.env.API_URL) {
    return process.env.API_URL;
  }
  if (IS_DEV) {
    return "http://localhost:8080/v1";
  }
  // Production: AWS API Gateway
  return "https://osjsexo43j.execute-api.us-east-1.amazonaws.com/prod/v1";
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
    infoPlist: {
      NSCameraUsageDescription:
        "レシートを撮影して食事記録に利用するため、カメラを使用します。",
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#4CAF50",
    },
    package: "com.konbininavi.app",
    permissions: ["CAMERA"],
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-image-picker",
      {
        cameraPermission:
          "レシートを撮影して食事記録に利用するため、カメラを使用します。",
      },
    ],
  ],
  extra: {
    apiUrl: getApiUrl(),
    cognitoUserPoolId: process.env.COGNITO_USER_POOL_ID ?? "",
    cognitoClientId: process.env.COGNITO_CLIENT_ID ?? "",
    cognitoRegion: process.env.COGNITO_REGION ?? "us-east-1",
    bypassAuth: process.env.EXPO_PUBLIC_BYPASS_AUTH === "1",
    router: {
      origin: false,
    },
  },
});
