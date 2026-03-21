import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import Constants from "expo-constants";
import { useAuth } from "../hooks/useAuth";
import { useNutrition } from "../hooks/useNutrition";
import {
  CalendarHealthTone,
  useNutritionCalendar,
} from "../hooks/useNutritionCalendar";
import {
  NutrientStatus,
  NutritionStatus,
  STATUS_LABELS,
} from "../lib/types";
import {
  addMonths,
  formatDateKey,
  getMonthKey,
  parseDateKey,
} from "../lib/date";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const CALENDAR_STARTED_MONTH_KEY = "@konbini_navi_calendar_started_month";
const DEV_CALENDAR_STARTED_MONTH =
  Constants.expoConfig?.extra?.calendarStartedMonth ?? "";

const formatFullDate = (dateStr: string): string => {
  const d = parseDateKey(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 (${WEEKDAYS[d.getDay()]})`;
};

const getStatusColor = (status: NutritionStatus): string => {
  switch (status) {
    case "deficient":
      return "#FF9800";
    case "adequate":
      return "#4CAF50";
    case "excessive":
      return "#F44336";
  }
};

const getStatusBgColor = (status: NutritionStatus): string => {
  switch (status) {
    case "deficient":
      return "#FFF3E0";
    case "adequate":
      return "#E8F5E9";
    case "excessive":
      return "#FFEBEE";
  }
};

const HEALTH_TONE_META: Record<
  CalendarHealthTone,
  { label: string; color: string; backgroundColor: string }
> = {
  good: {
    label: "良好",
    color: "#1B5E20",
    backgroundColor: "#E8F5E9",
  },
  warning: {
    label: "やや注意",
    color: "#E65100",
    backgroundColor: "#FFF3E0",
  },
  bad: {
    label: "要改善",
    color: "#B71C1C",
    backgroundColor: "#FFEBEE",
  },
  empty: {
    label: "記録なし",
    color: "#546E7A",
    backgroundColor: "#ECEFF1",
  },
  unknown: {
    label: "読込中",
    color: "#546E7A",
    backgroundColor: "#F5F5F5",
  },
};

interface NutrientCardProps {
  label: string;
  unit: string;
  data: NutrientStatus;
}

const NutrientCard = ({ label, unit, data }: NutrientCardProps) => {
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
};

const getSummaryText = (
  calories: NutrientStatus,
  protein: NutrientStatus
): string => {
  const deficients: string[] = [];
  if (calories.status === "deficient") deficients.push("カロリー");
  if (protein.status === "deficient") deficients.push("タンパク質");

  if (deficients.length === 0) {
    return "栄養バランスが良好です。この調子で続けましょう！";
  }
  return `${deficients.join("と")}が不足しています。おすすめ画面で補える商品をチェックしましょう。`;
};

const buildCalendarGrid = (month: string): string[] => {
  const [year, monthIndex] = month.split("-").map(Number);
  const firstDay = new Date(year, monthIndex - 1, 1);
  const lastDay = new Date(year, monthIndex, 0);
  const leading = firstDay.getDay();
  const dates: string[] = [];

  for (let i = 0; i < leading; i += 1) {
    dates.push("");
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    dates.push(formatDateKey(new Date(year, monthIndex - 1, day)));
  }

  while (dates.length % 7 !== 0) {
    dates.push("");
  }

  return dates;
};

const HomeScreen = () => {
  const router = useRouter();
  const { deviceId } = useAuth();
  const [selectedDate, setSelectedDate] = useState(formatDateKey(new Date()));
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(getMonthKey(selectedDate));
  const [startedMonth, setStartedMonth] = useState(getMonthKey(selectedDate));
  const selectedMonth = calendarMonth;
  const { nutrition, isLoading, refetch } = useNutrition(deviceId, selectedDate);
  const calendar = useNutritionCalendar(deviceId, selectedMonth);
  const [refreshing, setRefreshing] = useState(false);
  const currentMonth = getMonthKey(formatDateKey(new Date()));

  useEffect(() => {
    setCalendarMonth(getMonthKey(selectedDate));
  }, [selectedDate]);

  useEffect(() => {
    const ensureStartedMonth = async () => {
      const current = getMonthKey(formatDateKey(new Date()));
      if (DEV_CALENDAR_STARTED_MONTH) {
        setStartedMonth(DEV_CALENDAR_STARTED_MONTH);
        return;
      }
      const stored = await AsyncStorage.getItem(CALENDAR_STARTED_MONTH_KEY);
      if (stored) {
        setStartedMonth(stored);
        return;
      }
      await AsyncStorage.setItem(CALENDAR_STARTED_MONTH_KEY, current);
      setStartedMonth(current);
    };

    void ensureStartedMonth();
  }, []);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([calendar.refresh(), Promise.resolve(refetch())]);
    setRefreshing(false);
  };

  const calendarGrid = useMemo(() => buildCalendarGrid(selectedMonth), [selectedMonth]);
  const canGoPrevMonth = calendarMonth > startedMonth;
  const canGoNextMonth = calendarMonth < currentMonth;

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroDateText}>{formatFullDate(selectedDate)}</Text>
            <TouchableOpacity
              style={styles.calendarButton}
              onPress={() => setCalendarVisible(true)}
            >
              <Ionicons name="calendar-outline" size={22} color="#2E7D32" />
            </TouchableOpacity>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <Text style={styles.loadingText}>データを読み込み中...</Text>
          </View>
        ) : nutrition ? (
          <View style={styles.cardsContainer}>
            <NutrientCard label="カロリー" unit="kcal" data={nutrition.calories} />
            <NutrientCard label="たんぱく質" unit="g" data={nutrition.protein} />
            <NutrientCard label="脂質" unit="g" data={nutrition.fat} />
            <NutrientCard label="炭水化物" unit="g" data={nutrition.carbs} />
          </View>
        ) : (
          <View style={styles.loadingCard}>
            <Text style={styles.loadingText}>
              この日のデータはありません。食事を記録すると状態を確認できます。
            </Text>
          </View>
        )}

        {nutrition && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>この日のまとめ</Text>
            <Text style={styles.summaryText}>
              {getSummaryText(nutrition.calories, nutrition.protein)}
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={calendarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.calendarModal}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderContent}>
                <View style={styles.monthSwitchRow}>
                  <TouchableOpacity
                    style={[
                      styles.monthSwitchButton,
                      !canGoPrevMonth && styles.monthSwitchButtonDisabled,
                    ]}
                    onPress={() => canGoPrevMonth && setCalendarMonth(addMonths(calendarMonth, -1))}
                    disabled={!canGoPrevMonth}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={18}
                      color={canGoPrevMonth ? "#203124" : "#B0B8B1"}
                    />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>
                    {parseDateKey(`${selectedMonth}-01`).getFullYear()}年
                    {parseDateKey(`${selectedMonth}-01`).getMonth() + 1}月
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.monthSwitchButton,
                      !canGoNextMonth && styles.monthSwitchButtonDisabled,
                    ]}
                    onPress={() => canGoNextMonth && setCalendarMonth(addMonths(calendarMonth, 1))}
                    disabled={!canGoNextMonth}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={canGoNextMonth ? "#203124" : "#B0B8B1"}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalSubtitle}>
                  色付きドットで健康状態を確認できます
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCalendarVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.weekdayRow}>
              {WEEKDAYS.map((weekday) => (
                <Text key={weekday} style={styles.weekdayLabel}>
                  {weekday}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarGrid.map((date, index) => {
                if (!date) {
                  return <View key={`empty-${index}`} style={styles.calendarCell} />;
                }

                const day = calendar.getDay(date);
                const tone = day?.tone ?? "unknown";
                const isSelected = date === selectedDate;
                const meta = HEALTH_TONE_META[tone];

                return (
                  <TouchableOpacity
                    key={date}
                    style={[
                      styles.calendarCell,
                      isSelected && styles.calendarCellActive,
                    ]}
                    onPress={() => {
                      setCalendarVisible(false);
                      setSelectedDate(date);
                      router.push({ pathname: "/history", params: { date } });
                    }}
                  >
                    <Text
                      style={[
                        styles.calendarDateLabel,
                        isSelected && styles.calendarDateLabelActive,
                      ]}
                    >
                      {parseDateKey(date).getDate()}
                    </Text>
                    <View
                      style={[
                        styles.calendarToneDot,
                        { backgroundColor: meta.color },
                      ]}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.legendRow}>
              {(["good", "warning", "bad", "empty"] as CalendarHealthTone[]).map(
                (tone) => (
                  <View key={tone} style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        { backgroundColor: HEALTH_TONE_META[tone].color },
                      ]}
                    />
                    <Text style={styles.legendText}>{HEALTH_TONE_META[tone].label}</Text>
                  </View>
                )
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroDateText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#203124",
    flex: 1,
    marginRight: 12,
  },
  cardsContainer: {
    gap: 12,
  },
  calendarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EDF6EE",
    alignItems: "center",
    justifyContent: "center",
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 18, 0.35)",
    justifyContent: "center",
    padding: 20,
  },
  calendarModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  modalHeaderContent: {
    flex: 1,
    marginRight: 12,
  },
  monthSwitchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  monthSwitchButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F2F5F2",
    alignItems: "center",
    justifyContent: "center",
  },
  monthSwitchButtonDisabled: {
    backgroundColor: "#F5F5F5",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#203124",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#607063",
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: "#708070",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  calendarCell: {
    width: "14.285%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 14,
    minHeight: 52,
  },
  calendarCellActive: {
    backgroundColor: "#EEF7EF",
  },
  calendarDateLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#324234",
    marginBottom: 4,
  },
  calendarDateLabelActive: {
    color: "#1B5E20",
  },
  calendarToneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: "#607063",
  },
});
