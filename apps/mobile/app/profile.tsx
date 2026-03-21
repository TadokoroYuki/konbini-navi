import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../hooks/useAuth";
import { getProfile, updateProfile } from "../lib/api-client";
import { UserProfile } from "../lib/types";

const ACTIVITY_LEVELS = [
  { value: "low", label: "低い" },
  { value: "moderate", label: "普通" },
  { value: "high", label: "高い" },
] as const;

const GENDER_OPTIONS = [
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
] as const;

const ProfileScreen = () => {
  const { userId, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [targetCalories, setTargetCalories] = useState("");
  const [targetProtein, setTargetProtein] = useState("");
  const [targetFat, setTargetFat] = useState("");
  const [targetCarbs, setTargetCarbs] = useState("");

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const profile = await getProfile(userId);
      if (profile.gender) setGender(profile.gender);
      if (profile.age) setAge(String(profile.age));
      if (profile.heightCm) setHeightCm(String(profile.heightCm));
      if (profile.weightKg) setWeightKg(String(profile.weightKg));
      if (profile.activityLevel) setActivityLevel(profile.activityLevel);
      if (profile.targetCalories) setTargetCalories(String(profile.targetCalories));
      if (profile.targetProtein) setTargetProtein(String(profile.targetProtein));
      if (profile.targetFat) setTargetFat(String(profile.targetFat));
      if (profile.targetCarbs) setTargetCarbs(String(profile.targetCarbs));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleSave = async () => {
    if (!userId) return;
    setIsSaving(true);
    try {
      const data: Partial<UserProfile> = {
        gender: gender || undefined,
        age: age ? Number(age) : undefined,
        heightCm: heightCm ? Number(heightCm) : undefined,
        weightKg: weightKg ? Number(weightKg) : undefined,
        activityLevel: activityLevel || undefined,
        targetCalories: targetCalories ? Number(targetCalories) : undefined,
        targetProtein: targetProtein ? Number(targetProtein) : undefined,
        targetFat: targetFat ? Number(targetFat) : undefined,
        targetCarbs: targetCarbs ? Number(targetCarbs) : undefined,
      };
      await updateProfile(userId, data);
      Alert.alert("保存完了", "プロフィールを更新しました");
    } catch {
      Alert.alert("エラー", "保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("ログアウト", "ログアウトしますか？", [
      { text: "キャンセル", style: "cancel" },
      { text: "ログアウト", style: "destructive", onPress: signOut },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* 基本情報 */}
        <Text style={styles.sectionTitle}>基本情報</Text>
        <View style={styles.card}>
          <Text style={styles.label}>性別</Text>
          <View style={styles.segmentRow}>
            {GENDER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.segmentButton,
                  gender === opt.value && styles.segmentButtonActive,
                ]}
                onPress={() => setGender(opt.value)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    gender === opt.value && styles.segmentTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>年齢</Text>
          <TextInput
            style={styles.input}
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            placeholder="25"
            placeholderTextColor="#ccc"
          />

          <Text style={styles.label}>身長 (cm)</Text>
          <TextInput
            style={styles.input}
            value={heightCm}
            onChangeText={setHeightCm}
            keyboardType="decimal-pad"
            placeholder="170"
            placeholderTextColor="#ccc"
          />

          <Text style={styles.label}>体重 (kg)</Text>
          <TextInput
            style={styles.input}
            value={weightKg}
            onChangeText={setWeightKg}
            keyboardType="decimal-pad"
            placeholder="60"
            placeholderTextColor="#ccc"
          />

          <Text style={styles.label}>活動レベル</Text>
          <View style={styles.segmentRow}>
            {ACTIVITY_LEVELS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.segmentButton,
                  activityLevel === opt.value && styles.segmentButtonActive,
                ]}
                onPress={() => setActivityLevel(opt.value)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    activityLevel === opt.value && styles.segmentTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 栄養目標 */}
        <Text style={styles.sectionTitle}>1日の栄養目標</Text>
        <View style={styles.card}>
          <Text style={styles.hint}>
            未設定の場合はデフォルト値が使われます
          </Text>

          <Text style={styles.label}>カロリー (kcal)</Text>
          <TextInput
            style={styles.input}
            value={targetCalories}
            onChangeText={setTargetCalories}
            keyboardType="number-pad"
            placeholder="2000"
            placeholderTextColor="#ccc"
          />

          <Text style={styles.label}>タンパク質 (g)</Text>
          <TextInput
            style={styles.input}
            value={targetProtein}
            onChangeText={setTargetProtein}
            keyboardType="number-pad"
            placeholder="65"
            placeholderTextColor="#ccc"
          />

          <Text style={styles.label}>脂質 (g)</Text>
          <TextInput
            style={styles.input}
            value={targetFat}
            onChangeText={setTargetFat}
            keyboardType="number-pad"
            placeholder="55"
            placeholderTextColor="#ccc"
          />

          <Text style={styles.label}>炭水化物 (g)</Text>
          <TextInput
            style={styles.input}
            value={targetCarbs}
            onChangeText={setTargetCarbs}
            keyboardType="number-pad"
            placeholder="300"
            placeholderTextColor="#ccc"
          />
        </View>

        {/* 保存ボタン */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>保存する</Text>
          )}
        </TouchableOpacity>

        {/* ログアウト */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>ログアウト</Text>
        </TouchableOpacity>

        <View style={{ height: 48 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4CAF50",
    marginTop: 12,
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginTop: 12,
    marginBottom: 6,
  },
  hint: {
    fontSize: 13,
    color: "#888",
  },
  input: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#333",
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
  segmentButtonActive: {
    backgroundColor: "#E8F5E9",
    borderColor: "#4CAF50",
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
  },
  segmentTextActive: {
    color: "#4CAF50",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  signOutButton: {
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  signOutText: {
    color: "#F44336",
    fontSize: 15,
    fontWeight: "600",
  },
});
