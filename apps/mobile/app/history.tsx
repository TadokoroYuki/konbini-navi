import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../hooks/useAuth";
import { useNutrition } from "../hooks/useNutrition";
import { listRecords, deleteRecord } from "../lib/api-client";
import {
  MealRecord,
  MEAL_TYPE_LABELS,
  BRAND_LABELS,
  NutrientStatus,
  STATUS_LABELS,
  NutritionStatus,
} from "../lib/types";

function formatDateStr(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const weekday = weekdays[d.getDay()];
  return `${year}年${month}月${day}日（${weekday}）`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getToday(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStatusColor(status: NutritionStatus): string {
  switch (status) {
    case "deficient":
      return "#FF9800";
    case "adequate":
      return "#4CAF50";
    case "excessive":
      return "#F44336";
  }
}

interface NutrientMiniProps {
  label: string;
  data: NutrientStatus;
  unit: string;
}

function NutrientMini({ label, data, unit }: NutrientMiniProps) {
  return (
    <View style={styles.nutrientMini}>
      <Text style={styles.nutrientMiniLabel}>{label}</Text>
      <Text
        style={[
          styles.nutrientMiniValue,
          { color: getStatusColor(data.status) },
        ]}
      >
        {Math.round(data.actual)}{unit}
      </Text>
      <Text style={styles.nutrientMiniStatus}>
        {STATUS_LABELS[data.status]}
      </Text>
    </View>
  );
}

export default function HistoryScreen() {
  const { deviceId } = useAuth();
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [records, setRecords] = useState<MealRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { nutrition } = useNutrition(deviceId, selectedDate);

  const isToday = selectedDate === getToday();

  const fetchRecords = useCallback(async () => {
    if (!deviceId) return;
    setIsLoading(true);
    try {
      const data = await listRecords(deviceId, selectedDate);
      setRecords(data);
    } catch {
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [deviceId, selectedDate]);

  useFocusEffect(
    useCallback(() => {
      fetchRecords();
    }, [fetchRecords])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRecords();
    setRefreshing(false);
  };

  const handleDelete = (record: MealRecord) => {
    Alert.alert(
      "記録を削除",
      `${record.product.name}の記録を削除しますか？`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: async () => {
            if (!deviceId) return;
            try {
              await deleteRecord(deviceId, record.recordId);
              setRecords((prev) =>
                prev.filter((r) => r.recordId !== record.recordId)
              );
            } catch {
              Alert.alert("エラー", "削除に失敗しました。");
            }
          },
        },
      ]
    );
  };

  const goToPrevDay = () => setSelectedDate(addDays(selectedDate, -1));
  const goToNextDay = () => {
    if (!isToday) {
      setSelectedDate(addDays(selectedDate, 1));
    }
  };

  // Group records by meal type
  const groupedRecords = records.reduce<
    Partial<Record<string, MealRecord[]>>
  >((acc, record) => {
    const key = record.mealType;
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(record);
    return acc;
  }, {});

  const mealOrder = ["breakfast", "lunch", "dinner", "snack"] as const;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Date Navigator */}
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={goToPrevDay} style={styles.dateNavButton}>
          <Ionicons name="chevron-back" size={24} color="#4CAF50" />
        </TouchableOpacity>
        <Text style={styles.dateNavText}>{formatDateStr(selectedDate)}</Text>
        <TouchableOpacity
          onPress={goToNextDay}
          style={styles.dateNavButton}
          disabled={isToday}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={isToday ? "#ccc" : "#4CAF50"}
          />
        </TouchableOpacity>
      </View>

      {/* Nutrition Summary */}
      {nutrition && (
        <View style={styles.nutritionSummary}>
          <NutrientMini label="Cal" data={nutrition.calories} unit="kcal" />
          <NutrientMini label="P" data={nutrition.protein} unit="g" />
          <NutrientMini label="F" data={nutrition.fat} unit="g" />
          <NutrientMini label="C" data={nutrition.carbs} unit="g" />
        </View>
      )}

      {/* Records */}
      {isLoading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>読み込み中...</Text>
        </View>
      ) : records.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="restaurant-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>この日の記録はありません</Text>
        </View>
      ) : (
        mealOrder.map((mealType) => {
          const mealRecords = groupedRecords[mealType];
          if (!mealRecords || mealRecords.length === 0) return null;
          return (
            <View key={mealType} style={styles.mealGroup}>
              <Text style={styles.mealGroupTitle}>
                {MEAL_TYPE_LABELS[mealType]}
              </Text>
              {mealRecords.map((record) => (
                <View key={record.recordId} style={styles.recordCard}>
                  <View style={styles.recordInfo}>
                    <Text style={styles.recordName}>
                      {record.product.name}
                    </Text>
                    <Text style={styles.recordBrand}>
                      {BRAND_LABELS[record.product.brand]}
                    </Text>
                    <Text style={styles.recordCalories}>
                      {record.product.nutrition.calories} kcal ・{" "}
                      {record.product.price}円
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDelete(record)}
                    style={styles.deleteButton}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color="#F44336"
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  dateNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  dateNavButton: {
    padding: 4,
  },
  dateNavText: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#333",
  },
  nutritionSummary: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    justifyContent: "space-around",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  nutrientMini: {
    alignItems: "center",
  },
  nutrientMiniLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 2,
  },
  nutrientMiniValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  nutrientMiniStatus: {
    fontSize: 11,
    color: "#666",
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 48,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    marginTop: 12,
  },
  mealGroup: {
    marginBottom: 16,
  },
  mealGroupTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 8,
    paddingLeft: 4,
  },
  recordCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  recordInfo: {
    flex: 1,
  },
  recordName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  recordBrand: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  recordCalories: {
    fontSize: 13,
    color: "#FF9800",
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
  },
});
