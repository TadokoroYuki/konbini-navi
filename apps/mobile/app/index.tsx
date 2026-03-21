import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../hooks/useAuth";
import { useHealthScoreStreak } from "../hooks/useHealthScoreStreak";
import { useNutrition } from "../hooks/useNutrition";
import { getToday, parseDateString } from "../lib/date";
import {
  calculateHealthScore,
  getHealthScoreTone,
} from "../lib/health-score";
import {
  NutrientStatus,
  NutritionStatus,
  STATUS_LABELS,
} from "../lib/types";

const GAUGE_DOT_COUNT = 24;
const STREAK_TARGET = 80;

const formatDate = (dateStr: string): string => {
  const d = parseDateString(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const weekday = weekdays[d.getDay()];
  return `${year}年${month}月${day}日 (${weekday})`;
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

const ScoreGauge = ({
  score,
  label,
  color,
}: {
  score: number;
  label: string;
  color: string;
}) => {
  const activeDots = Math.max(
    0,
    Math.min(GAUGE_DOT_COUNT, Math.round((score / 100) * GAUGE_DOT_COUNT))
  );
  const dots = Array.from({ length: GAUGE_DOT_COUNT }, (_, index) => {
    const angle = (-90 + (360 / GAUGE_DOT_COUNT) * index) * (Math.PI / 180);
    const radius = 58;
    return {
      index,
      left: 68 + Math.cos(angle) * radius - 5,
      top: 68 + Math.sin(angle) * radius - 5,
      active: index < activeDots,
    };
  });

  return (
    <View style={styles.scorePanel}>
      <View style={styles.scoreGauge}>
        {dots.map((dot) => (
          <View
            key={dot.index}
            style={[
              styles.scoreDot,
              {
                left: dot.left,
                top: dot.top,
                backgroundColor: dot.active ? color : "#D7DEE6",
              },
            ]}
          />
        ))}
        <View style={styles.scoreCenter}>
          <Text style={[styles.scoreValue, { color }]}>{score}</Text>
          <Text style={styles.scoreUnit}>/100</Text>
        </View>
      </View>
      <Text style={styles.scoreCaption}>今日の健康スコア</Text>
      <Text style={[styles.scoreLabel, { color }]}>{label}</Text>
    </View>
  );
};

const StreakCard = ({
  streak,
  isLoading,
}: {
  streak: number;
  isLoading: boolean;
}) => {
  const isStarted = streak > 0;

  return (
    <View style={styles.streakCard}>
      <Text style={styles.streakEyebrow}>STREAK</Text>
      {isLoading ? (
        <Text style={styles.streakValue}>計算中...</Text>
      ) : isStarted ? (
        <>
          <Text style={styles.streakTitle}>{STREAK_TARGET}点以上の連続達成</Text>
          <Text style={styles.streakValue}>{`${streak}日`}</Text>
          <Text style={styles.streakHint}>
            この調子で積み上げていきましょう。
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.streakTitle}>連続達成はこれから</Text>
          <Text style={styles.streakValue}>{`今日${STREAK_TARGET}点で開始`}</Text>
          <Text style={styles.streakHint}>
            まずは今日、目標点を超えるところから始めましょう。
          </Text>
        </>
      )}
    </View>
  );
};

const SummarySection = ({
  summary,
  onPressRecommend,
}: {
  summary: string;
  onPressRecommend: () => void;
}) => {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>この日のまとめ</Text>
      <Text style={styles.summaryText}>{summary}</Text>
      <Text style={styles.summaryLink} onPress={onPressRecommend}>
        おすすめ商品を見る
      </Text>
    </View>
  );
};

const getSummaryText = (
  calories: NutrientStatus,
  protein: NutrientStatus,
  fat: NutrientStatus,
  carbs: NutrientStatus
): string => {
  const deficients: string[] = [];
  const excessive: string[] = [];

  if (calories.status === "deficient") deficients.push("カロリー");
  if (protein.status === "deficient") deficients.push("たんぱく質");
  if (fat.status === "deficient") deficients.push("脂質");
  if (carbs.status === "deficient") deficients.push("炭水化物");

  if (calories.status === "excessive") excessive.push("カロリー");
  if (fat.status === "excessive") excessive.push("脂質");
  if (carbs.status === "excessive") excessive.push("炭水化物");

  if (deficients.length === 0 && excessive.length === 0) {
    return "栄養バランスが良好です。この調子で続けましょう。";
  }
  if (deficients.length > 0 && excessive.length === 0) {
    return `${deficients.join("・")}が不足気味です。おすすめ商品で補える食事を探してみましょう。`;
  }
  if (deficients.length === 0) {
    return `${excessive.join("・")}が多めです。次の食事は軽めに整えるのがおすすめです。`;
  }
  return `${deficients.join("・")}の不足と${excessive.join("・")}の摂りすぎが見られます。おすすめ商品も参考にしながら整えましょう。`;
};

const HomeScreen = () => {
  const router = useRouter();
  const { deviceId } = useAuth();
  const today = getToday();
  const { nutrition, isLoading, refetch } = useNutrition(deviceId, today);
  const { streak, isLoading: isStreakLoading } = useHealthScoreStreak(
    deviceId,
    today,
    STREAK_TARGET
  );
  const [refreshing, setRefreshing] = useState(false);

  const scoreResult = useMemo(
    () => (nutrition ? calculateHealthScore(nutrition) : null),
    [nutrition]
  );
  const scoreTone = scoreResult
    ? getHealthScoreTone(scoreResult.total)
    : null;

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const goToRecommend = () => {
    router.push("/recommend");
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.dateHeader}>
        <Text style={styles.dateText}>{formatDate(today)}</Text>
        <Text style={styles.dateSubText}>
          その日の栄養バランスを確認できます
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>データを読み込み中...</Text>
        </View>
      ) : nutrition ? (
        <>
          {scoreResult && scoreTone ? (
            <>
              <View style={styles.heroRow}>
                <ScoreGauge
                  score={scoreResult.total}
                  label={scoreTone.label}
                  color={scoreTone.color}
                />
                <StreakCard
                  streak={streak}
                  isLoading={isStreakLoading}
                />
              </View>
              <SummarySection
                summary={getSummaryText(
                  nutrition.calories,
                  nutrition.protein,
                  nutrition.fat,
                  nutrition.carbs
                )}
                onPressRecommend={goToRecommend}
              />
            </>
          ) : null}

          <View style={styles.cardsContainer}>
            <NutrientCard label="カロリー" unit="kcal" data={nutrition.calories} />
            <NutrientCard label="たんぱく質" unit="g" data={nutrition.protein} />
            <NutrientCard label="脂質" unit="g" data={nutrition.fat} />
            <NutrientCard label="炭水化物" unit="g" data={nutrition.carbs} />
          </View>
        </>
      ) : (
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>
            この日のデータはありません。食事を記録してみましょう。
          </Text>
        </View>
      )}
    </ScrollView>
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
  dateHeader: {
    gap: 4,
  },
  dateText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  dateSubText: {
    fontSize: 14,
    color: "#888",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
    minHeight: 184,
  },
  streakCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  streakEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#7C8A97",
  },
  streakTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2933",
    marginTop: 8,
    lineHeight: 20,
  },
  streakValue: {
    fontSize: 34,
    fontWeight: "800",
    color: "#1F2933",
    marginTop: 12,
  },
  streakHint: {
    fontSize: 12,
    color: "#6B7785",
    lineHeight: 18,
    marginTop: 8,
  },
  scorePanel: {
    width: 168,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreGauge: {
    width: 136,
    height: 136,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  scoreDot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  scoreCenter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  scoreValue: {
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 38,
  },
  scoreUnit: {
    fontSize: 12,
    color: "#7A7A7A",
    marginTop: 2,
  },
  scoreCaption: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginTop: 12,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    padding: 16,
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
  summaryLink: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "700",
    color: "#2E7D32",
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
    textAlign: "center",
  },
});
