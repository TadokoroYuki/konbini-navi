import { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { searchProducts } from "../lib/api-client";

const ScanScreen = () => {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const processingRef = useRef(false);

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setScanned(true);

    const barcode = result.data;
    setIsSearching(true);

    try {
      const products = await searchProducts({ q: barcode, limit: 5 });

      if (products.length > 0) {
        router.replace({
          pathname: "/record",
          params: { barcode, productId: products[0].productId },
        });
      } else {
        const showNotFound = () => {
          setScanned(false);
          processingRef.current = false;
        };

        if (Platform.OS === "web") {
          window.alert(`商品が見つかりませんでした (${barcode})`);
          showNotFound();
        } else {
          Alert.alert(
            "商品が見つかりません",
            `バーコード ${barcode} に該当する商品が見つかりませんでした。`,
            [{ text: "再スキャン", onPress: showNotFound }]
          );
        }
      }
    } catch {
      setScanned(false);
      processingRef.current = false;
    } finally {
      setIsSearching(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="camera-outline" size={64} color="#999" />
        <Text style={styles.permissionTitle}>カメラの許可が必要です</Text>
        <Text style={styles.permissionText}>
          バーコードをスキャンするにはカメラへのアクセスを許可してください。
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>カメラを許可する</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>戻る</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom}>
          {isSearching ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.overlayText}>商品を検索中...</Text>
            </>
          ) : (
            <Text style={styles.overlayText}>バーコードをスキャンしてください</Text>
          )}
        </View>
      </View>

      {/* Close button */}
      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <Ionicons name="close" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

export default ScanScreen;

const SCAN_AREA_SIZE = 260;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 32,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayTop: {
    flex: 1,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  overlayMiddle: {
    flexDirection: "row",
    height: SCAN_AREA_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
  },
  overlayBottom: {
    flex: 1,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    paddingTop: 32,
  },
  overlayText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 8,
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#4CAF50",
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  closeButton: {
    position: "absolute",
    top: 56,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  backButtonText: {
    color: "#666",
    fontSize: 14,
  },
});
