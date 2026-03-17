import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setDeviceId } from "../lib/api-client";

const DEVICE_ID_KEY = "@konbini_navi_device_id";

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useAuth(): {
  deviceId: string | null;
  isLoading: boolean;
} {
  const [deviceId, setDeviceIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initDeviceId() {
      try {
        let storedId = await AsyncStorage.getItem(DEVICE_ID_KEY);
        if (!storedId) {
          storedId = generateUUID();
          await AsyncStorage.setItem(DEVICE_ID_KEY, storedId);
        }
        setDeviceIdState(storedId);
        setDeviceId(storedId);
      } catch {
        // Fallback: generate a temporary ID
        const tempId = generateUUID();
        setDeviceIdState(tempId);
        setDeviceId(tempId);
      } finally {
        setIsLoading(false);
      }
    }
    initDeviceId();
  }, []);

  return { deviceId, isLoading };
}
