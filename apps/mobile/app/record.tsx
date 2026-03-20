import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../hooks/useAuth";
import {
  searchProducts,
  createRecord,
  listRecords,
} from "../lib/api-client";
import {
  Product,
  MealType,
  MealRecord,
  MEAL_TYPE_LABELS,
  BRAND_LABELS,
} from "../lib/types";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

function getToday(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function RecordScreen() {
  const { deviceId } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMealType, setSelectedMealType] = useState<MealType>("lunch");
  const [products, setProducts] = useState<Product[]>([]);
  const [todayRecords, setTodayRecords] = useState<MealRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const today = getToday();

  const fetchTodayRecords = useCallback(async () => {
    if (!deviceId) return;
    try {
      const records = await listRecords(deviceId, today);
      setTodayRecords(records);
    } catch {
      // ignore
    }
  }, [deviceId, today]);

  useEffect(() => {
    fetchTodayRecords();
  }, [fetchTodayRecords]);

  // Initial product load
  useEffect(() => {
    handleSearch("");
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
    try {
      const results = await searchProducts({
        q: query || undefined,
        limit: 20,
      });
      setProducts(results);
    } catch {
      // ignore
    } finally {
      setIsSearching(false);
    }
  };

  const handleRecord = async (product: Product) => {
    if (!deviceId) return;

    const doRecord = async () => {
      setIsRecording(true);
      try {
        const record = await createRecord(deviceId, {
          productId: product.productId,
          date: today,
          mealType: selectedMealType,
        });
        setTodayRecords((prev) => [...prev, record]);
        if (Platform.OS === "web") {
          window.alert(`${product.name}を記録しました。`);
        } else {
          Alert.alert("記録完了", `${product.name}を記録しました。`);
        }
      } catch {
        if (Platform.OS === "web") {
          window.alert("記録に失敗しました。");
        } else {
          Alert.alert("エラー", "記録に失敗しました。");
        }
      } finally {
        setIsRecording(false);
      }
    };

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        `${product.name}を${MEAL_TYPE_LABELS[selectedMealType]}として記録しますか？`
      );
      if (confirmed) {
        doRecord();
      }
    } else {
      Alert.alert(
        "食事を記録",
        `${product.name}を${MEAL_TYPE_LABELS[selectedMealType]}として記録しますか？`,
        [
          { text: "キャンセル", style: "cancel" },
          { text: "記録する", onPress: doRecord },
        ]
      );
    }
  };

  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => handleRecord(item)}
      disabled={isRecording}
    >
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productBrand}>{BRAND_LABELS[item.brand]}</Text>
        <View style={styles.productMeta}>
          <Text style={styles.productCalories}>
            {item.nutrition.calories} kcal
          </Text>
          <Text style={styles.productPrice}>{item.price}円</Text>
        </View>
      </View>
      <Ionicons name="add-circle-outline" size={28} color="#4CAF50" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#999"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="商品名で検索..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch("")}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Meal Type Selector */}
      <View style={styles.mealTypeContainer}>
        {MEAL_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.mealTypeButton,
              selectedMealType === type && styles.mealTypeButtonActive,
            ]}
            onPress={() => setSelectedMealType(type)}
          >
            <Text
              style={[
                styles.mealTypeText,
                selectedMealType === type && styles.mealTypeTextActive,
              ]}
            >
              {MEAL_TYPE_LABELS[type]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Product List */}
      <FlatList
        data={products}
        keyExtractor={(item) => item.productId}
        renderItem={renderProductItem}
        style={styles.productList}
        contentContainerStyle={styles.productListContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {isSearching ? (
              <ActivityIndicator size="small" color="#4CAF50" />
            ) : (
              <Text style={styles.emptyText}>商品が見つかりません</Text>
            )}
          </View>
        }
        ListFooterComponent={
          todayRecords.length > 0 ? (
            <View style={styles.todayRecordsSection}>
              <Text style={styles.todayRecordsTitle}>
                今日の記録 ({todayRecords.length}件)
              </Text>
              {todayRecords.map((record) => (
                <View key={record.recordId} style={styles.recordItem}>
                  <View>
                    <Text style={styles.recordName}>
                      {record.product.name}
                    </Text>
                    <Text style={styles.recordMeta}>
                      {MEAL_TYPE_LABELS[record.mealType]} ・{" "}
                      {record.product.nutrition.calories} kcal
                    </Text>
                  </View>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color="#4CAF50"
                  />
                </View>
              ))}
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  mealTypeContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  mealTypeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#fff",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  mealTypeButtonActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  mealTypeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  mealTypeTextActive: {
    color: "#fff",
  },
  productList: {
    flex: 1,
  },
  productListContent: {
    padding: 16,
    paddingTop: 8,
    gap: 8,
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  productBrand: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  productMeta: {
    flexDirection: "row",
    gap: 12,
  },
  productCalories: {
    fontSize: 13,
    color: "#FF9800",
    fontWeight: "500",
  },
  productPrice: {
    fontSize: 13,
    color: "#666",
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
  },
  todayRecordsSection: {
    marginTop: 16,
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    padding: 16,
  },
  todayRecordsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 12,
  },
  recordItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#C8E6C9",
  },
  recordName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  recordMeta: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
});
