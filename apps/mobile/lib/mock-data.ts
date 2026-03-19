import {
  Product,
  MealRecord,
  NutritionSummary,
  Recommendation,
} from "./types";

const today = new Date().toISOString().split("T")[0];

export const mockProducts: Product[] = [
  {
    productId: "p001",
    name: "手巻おにぎり 鮭",
    brand: "seven_eleven",
    category: "onigiri",
    price: 160,
    nutrition: { calories: 183, protein: 5.2, fat: 1.5, carbs: 38.0 },
    imageUrl: "",
    description: "定番の鮭おにぎり",
  },
  {
    productId: "p002",
    name: "シーチキンマヨネーズおにぎり",
    brand: "family_mart",
    category: "onigiri",
    price: 148,
    nutrition: { calories: 232, protein: 5.8, fat: 6.2, carbs: 37.5 },
    imageUrl: "",
    description: "ツナマヨの定番",
  },
  {
    productId: "p003",
    name: "幕の内弁当",
    brand: "seven_eleven",
    category: "bento",
    price: 540,
    nutrition: { calories: 680, protein: 22.0, fat: 18.5, carbs: 98.0 },
    imageUrl: "",
    description: "バランスの良い幕の内弁当",
  },
  {
    productId: "p004",
    name: "ミックスサンド",
    brand: "lawson",
    category: "sandwich",
    price: 298,
    nutrition: { calories: 320, protein: 12.0, fat: 14.5, carbs: 35.0 },
    imageUrl: "",
    description: "たまご・ハム・ツナの3種",
  },
  {
    productId: "p005",
    name: "1/2日分の野菜サラダ",
    brand: "seven_eleven",
    category: "salad",
    price: 345,
    nutrition: {
      calories: 85,
      protein: 3.5,
      fat: 1.2,
      carbs: 14.0,
      fiber: 6.5,
    },
    imageUrl: "",
    description: "1日に必要な野菜の半分が摂れる",
  },
  {
    productId: "p006",
    name: "たんぱく質が摂れるチキン&チリ",
    brand: "family_mart",
    category: "sandwich",
    price: 368,
    nutrition: { calories: 265, protein: 22.5, fat: 8.0, carbs: 26.0 },
    imageUrl: "",
    description: "高タンパクサンドイッチ",
  },
  {
    productId: "p007",
    name: "豚汁",
    brand: "seven_eleven",
    category: "soup",
    price: 298,
    nutrition: {
      calories: 145,
      protein: 7.8,
      fat: 5.5,
      carbs: 16.0,
      fiber: 3.2,
    },
    imageUrl: "",
    description: "具だくさん豚汁",
  },
  {
    productId: "p008",
    name: "冷やし中華",
    brand: "lawson",
    category: "noodle",
    price: 498,
    nutrition: { calories: 450, protein: 15.0, fat: 12.0, carbs: 65.0 },
    imageUrl: "",
    description: "さっぱり冷やし中華",
  },
  {
    productId: "p009",
    name: "塩パン",
    brand: "family_mart",
    category: "bread",
    price: 138,
    nutrition: { calories: 210, protein: 4.5, fat: 10.0, carbs: 26.0 },
    imageUrl: "",
    description: "バター香る塩パン",
  },
  {
    productId: "p010",
    name: "プロテインバー チョコ",
    brand: "lawson",
    category: "sweets",
    price: 180,
    nutrition: { calories: 185, protein: 15.5, fat: 8.0, carbs: 15.0 },
    imageUrl: "",
    description: "高タンパク質のプロテインバー",
  },
  {
    productId: "p011",
    name: "サラダチキン プレーン",
    brand: "seven_eleven",
    category: "side_dish",
    price: 238,
    nutrition: { calories: 114, protein: 24.1, fat: 1.2, carbs: 0.3 },
    imageUrl: "",
    description: "低脂質・高タンパクのサラダチキン",
  },
  {
    productId: "p012",
    name: "緑茶 600ml",
    brand: "family_mart",
    category: "drink",
    price: 100,
    nutrition: { calories: 0, protein: 0, fat: 0, carbs: 0 },
    imageUrl: "",
    description: "すっきり緑茶",
  },
  {
    productId: "p013",
    name: "のり弁当",
    brand: "lawson",
    category: "bento",
    price: 430,
    nutrition: { calories: 720, protein: 18.0, fat: 22.0, carbs: 108.0 },
    imageUrl: "",
    description: "ボリューム満点のり弁当",
  },
  {
    productId: "p014",
    name: "たまごサンド",
    brand: "seven_eleven",
    category: "sandwich",
    price: 248,
    nutrition: { calories: 290, protein: 10.5, fat: 16.0, carbs: 26.0 },
    imageUrl: "",
    description: "ふわふわたまごサンド",
  },
  {
    productId: "p015",
    name: "味噌汁 しじみ",
    brand: "family_mart",
    category: "soup",
    price: 168,
    nutrition: {
      calories: 32,
      protein: 2.8,
      fat: 0.8,
      carbs: 3.2,
      salt: 1.8,
    },
    imageUrl: "",
    description: "しじみたっぷり味噌汁",
  },
];

export const mockRecords: MealRecord[] = [
  {
    recordId: "r001",
    userId: "device-001",
    productId: "p001",
    product: mockProducts[0],
    date: today,
    mealType: "breakfast",
    createdAt: `${today}T07:30:00Z`,
  },
  {
    recordId: "r002",
    userId: "device-001",
    productId: "p003",
    product: mockProducts[2],
    date: today,
    mealType: "lunch",
    createdAt: `${today}T12:15:00Z`,
  },
  {
    recordId: "r003",
    userId: "device-001",
    productId: "p005",
    product: mockProducts[4],
    date: today,
    mealType: "lunch",
    createdAt: `${today}T12:15:00Z`,
  },
];

export const mockNutritionSummary: NutritionSummary = {
  date: today,
  calories: { actual: 948, target: 2000, ratio: 0.474, status: "deficient" },
  protein: { actual: 30.7, target: 65, ratio: 0.472, status: "deficient" },
  fat: { actual: 21.2, target: 55, ratio: 0.385, status: "deficient" },
  carbs: { actual: 150.0, target: 300, ratio: 0.5, status: "deficient" },
};

export const mockRecommendations: Recommendation[] = [
  {
    product: mockProducts[10], // サラダチキン
    reason:
      "タンパク質が不足しています。サラダチキンで効率よくタンパク質を補えます。",
    deficientNutrients: ["protein"],
  },
  {
    product: mockProducts[5], // たんぱく質が摂れるチキン&チリ
    reason:
      "タンパク質と炭水化物が不足しています。バランスよく補えるサンドイッチです。",
    deficientNutrients: ["protein", "carbs"],
  },
  {
    product: mockProducts[6], // 豚汁
    reason:
      "全体的にカロリーが不足しています。具だくさんの豚汁で栄養バランスを整えましょう。",
    deficientNutrients: ["calories", "protein", "fat"],
  },
  {
    product: mockProducts[9], // プロテインバー
    reason: "間食にプロテインバーで手軽にタンパク質を補給できます。",
    deficientNutrients: ["protein"],
  },
];
