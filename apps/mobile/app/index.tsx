import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../hooks/useAuth";
import { useNutrition } from "../hooks/useNutrition";
import {
  NutrientStatus,
  NutritionStatus,
  STATUS_LABELS,
} from "../lib/types";

function getToday(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const weekday = weekdays[d.getDay()];
  return `${year}年${month}月${day}日（${weekday}）`;
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

function getStatusBgColor(status: NutritionStatus): string {
  switch (status) {
    case "deficient":
      return "#FFF3E0";
    case "adequate":
      return "#E8F5E9";
    case "excessive":
      return "#FFEBEE";
  }
}

interface NutrientCardProps {
  label: string;
  unit: string;
  data: NutrientStatus;
}

function NutrientCard({ label, unit, data }: NutrientCardProps) {
  const ratio = data.ratio ?? data.actual / data.target;
  const progressWidth = Math.min(ratio * 100, 100);
  const color = getStatusColor(data.status);
  const bgColor = getStatusBgColor(data.status);

  return (
    <View style={styles.nutrientCard}>
      <View style={styles.nutrientHeader}>
        <Text style={styles.nutrientLabel}>{label}</Text>
        <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
          <Text style={[styles.statusText, { color }]}>
            {STATUS_LABELS[data.status]}
          </Text>
        </View>
      </View>
      <Text style={styles.nutrientValue}>
        <Text style={styles.nutrientActual}>{Math.round(data.actual)}</Text>
        <Text style={styles.nutrientSeparator}> / </Text>
        <Text style={styles.nutrientTarget}>
          {Math.round(data.target)} {unit}
        </Text>
      </Text>
      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${progressWidth}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={styles.ratioText}>{Math.round(ratio * 100)}%</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { deviceId } = useAuth();
  const today = getToday();
  const { nutrition, isLoading, refetch } = useNutrition(deviceId, today);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    refetch();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Date Header */}
      <View style={styles.dateHeader}>
        <Text style={styles.dateText}>{formatDate(today)}</Text>
        <Text style={styles.dateSubText}>今日の栄養バランス</Text>
      </View>

      {/* Nutrition Cards */}
      {isLoading ? (
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>データを読み込み中...</Text>
        </View>
      ) : nutrition ? (
        <View style={styles.cardsContainer}>
          <NutrientCard
            label="カロリー"
            unit="kcal"
            data={nutrition.calories}
          />
          <NutrientCard
            label="タンパク質"
            unit="g"
            data={nutrition.protein}
          />
          <NutrientCard label="脂質" unit="g" data={nutrition.fat} />
          <NutrientCard label="炭水化物" unit="g" data={nutrition.carbs} />
        </View>
      ) : (
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>
            データがありません。食事を記録してみましょう。
          </Text>
        </View>
      )}

      {/* Summary */}
      {nutrition && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>今日のまとめ</Text>
          <Text style={styles.summaryText}>
            {getSummaryText(nutrition.calories, nutrition.protein)}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function getSummaryText(
  calories: NutrientStatus,
  protein: NutrientStatus
): string {
  const deficients: string[] = [];
  if (calories.status === "deficient") deficients.push("カロリー");
  if (protein.status === "deficient") deficients.push("タンパク質");

  if (deficients.length === 0) {
    return "栄養バランスが良好です。この調子で続けましょう！";
  }
  return `${deficients.join("と")}が不足しています。おすすめ画面で補える商品をチェックしましょう。`;
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
  dateHeader: {
    marginBottom: 20,
  },
  dateText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  dateSubText: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
  },
  cardsContainer: {
    gap: 12,
  },
  nutrientCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  nutrientHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  nutrientLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  nutrientValue: {
    marginBottom: 8,
  },
  nutrientActual: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  nutrientSeparator: {
    fontSize: 16,
    color: "#999",
  },
  nutrientTarget: {
    fontSize: 16,
    color: "#999",
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  ratioText: {
    fontSize: 12,
    color: "#888",
    textAlign: "right",
    marginTop: 4,
  },
  loadingCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingText: {
    fontSize: 14,
    color: "#888",
  },
  summaryCard: {
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
});
