import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../hooks/useAuth";
import { useNutrition } from "../hooks/useNutrition";
import { getRecommendations } from "../lib/api-client";
import { getToday } from "../lib/date";
import {
  Recommendation,
  BRAND_LABELS,
  NutrientStatus,
  NutritionStatus,
  STATUS_LABELS,
} from "../lib/types";

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

const NUTRIENT_LABELS: Record<string, string> = {
  calories: "カロリー",
  protein: "タンパク質",
  fat: "脂質",
  carbs: "炭水化物",
};

export default function RecommendScreen() {
  const { deviceId } = useAuth();
  const today = getToday();
  const { nutrition } = useNutrition(deviceId, today);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    if (!deviceId) return;
    setIsLoading(true);
    try {
      const data = await getRecommendations(deviceId, today);
      setRecommendations(data);
    } catch {
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  }, [deviceId, today]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRecommendations();
    setRefreshing(false);
  };

  // Collect deficient nutrients
  const deficientNutrients: { label: string; data: NutrientStatus }[] = [];
  if (nutrition) {
    const entries: [string, NutrientStatus][] = [
      ["カロリー", nutrition.calories],
      ["タンパク質", nutrition.protein],
      ["脂質", nutrition.fat],
      ["炭水化物", nutrition.carbs],
    ];
    for (const [label, data] of entries) {
      if (data.status === "deficient") {
        deficientNutrients.push({ label, data });
      }
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Deficient Nutrients Summary */}
      {deficientNutrients.length > 0 ? (
        <View style={styles.deficiencyCard}>
          <View style={styles.deficiencyHeader}>
            <Ionicons name="alert-circle" size={22} color="#FF9800" />
            <Text style={styles.deficiencyTitle}>不足している栄養素</Text>
          </View>
          <View style={styles.deficiencyList}>
            {deficientNutrients.map(({ label, data }) => {
              const ratio = data.ratio ?? data.actual / data.target;
              return (
                <View key={label} style={styles.deficiencyItem}>
                  <Text style={styles.deficiencyLabel}>{label}</Text>
                  <View style={styles.deficiencyBarBg}>
                    <View
                      style={[
                        styles.deficiencyBarFill,
                        { width: `${Math.min(ratio * 100, 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.deficiencyRatio}>
                    {Math.round(ratio * 100)}%
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : nutrition ? (
        <View style={styles.adequateCard}>
          <Ionicons name="checkmark-circle" size={28} color="#4CAF50" />
          <Text style={styles.adequateText}>
            栄養バランスは良好です！
          </Text>
        </View>
      ) : null}

      {/* Recommendations */}
      <Text style={styles.sectionTitle}>おすすめ商品</Text>

      {isLoading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>読み込み中...</Text>
        </View>
      ) : recommendations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="star-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>
            おすすめ商品がありません
          </Text>
        </View>
      ) : (
        recommendations.map((rec, index) => (
          <View key={index} style={styles.recommendCard}>
            <View style={styles.recommendHeader}>
              <View style={styles.recommendNameRow}>
                <Text style={styles.recommendName}>
                  {rec.product.name}
                </Text>
                <Text style={styles.recommendPrice}>
                  {rec.product.price}円
                </Text>
              </View>
              <Text style={styles.recommendBrand}>
                {BRAND_LABELS[rec.product.brand]}
              </Text>
            </View>

            {/* Nutrition Info */}
            <View style={styles.nutritionRow}>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionItemLabel}>Cal</Text>
                <Text style={styles.nutritionItemValue}>
                  {rec.product.nutrition.calories}
                </Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionItemLabel}>P</Text>
                <Text style={styles.nutritionItemValue}>
                  {rec.product.nutrition.protein}g
                </Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionItemLabel}>F</Text>
                <Text style={styles.nutritionItemValue}>
                  {rec.product.nutrition.fat}g
                </Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionItemLabel}>C</Text>
                <Text style={styles.nutritionItemValue}>
                  {rec.product.nutrition.carbs}g
                </Text>
              </View>
            </View>

            {/* Reason */}
            <View style={styles.reasonContainer}>
              <Ionicons name="bulb-outline" size={16} color="#FF9800" />
              <Text style={styles.reasonText}>{rec.reason}</Text>
            </View>

            {/* Deficient nutrients tags */}
            <View style={styles.tagRow}>
              {rec.deficientNutrients.map((nutrient) => (
                <View key={nutrient} style={styles.tag}>
                  <Text style={styles.tagText}>
                    {NUTRIENT_LABELS[nutrient] ?? nutrient}を補える
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))
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
  deficiencyCard: {
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  deficiencyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  deficiencyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#E65100",
  },
  deficiencyList: {
    gap: 10,
  },
  deficiencyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deficiencyLabel: {
    fontSize: 13,
    color: "#333",
    width: 70,
  },
  deficiencyBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: "#FFE0B2",
    borderRadius: 4,
    overflow: "hidden",
  },
  deficiencyBarFill: {
    height: "100%",
    backgroundColor: "#FF9800",
    borderRadius: 4,
  },
  deficiencyRatio: {
    fontSize: 12,
    color: "#E65100",
    fontWeight: "600",
    width: 36,
    textAlign: "right",
  },
  adequateCard: {
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  adequateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2E7D32",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
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
  recommendCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  recommendHeader: {
    marginBottom: 10,
  },
  recommendNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recommendName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  recommendPrice: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4CAF50",
  },
  recommendBrand: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  nutritionRow: {
    flexDirection: "row",
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 10,
    justifyContent: "space-around",
    marginBottom: 10,
  },
  nutritionItem: {
    alignItems: "center",
  },
  nutritionItemLabel: {
    fontSize: 11,
    color: "#888",
    marginBottom: 2,
  },
  nutritionItemValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  reasonContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 10,
  },
  reasonText: {
    fontSize: 13,
    color: "#555",
    flex: 1,
    lineHeight: 19,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    color: "#E65100",
    fontWeight: "600",
  },
});
