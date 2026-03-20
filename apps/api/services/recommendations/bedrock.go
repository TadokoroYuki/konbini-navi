package recommendations

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"github.com/TadokoroYuki/konbini-navi/apps/api/pkg/model"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
)

// AnalysisResponse represents the AI analysis result.
type AnalysisResponse struct {
	Analysis    string   `json:"analysis"`
	Suggestions []string `json:"suggestions"`
}

// Analyzer generates AI-powered meal analysis.
type Analyzer struct {
	nutritionClient *NutritionClient
	bedrockClient   *bedrockruntime.Client
}

// NewAnalyzer creates a new Analyzer. If Bedrock is unavailable, bedrockClient will be nil
// and the analyzer falls back to rule-based analysis.
func NewAnalyzer(nutritionClient *NutritionClient, awsRegion string) *Analyzer {
	a := &Analyzer{nutritionClient: nutritionClient}

	cfg, err := config.LoadDefaultConfig(context.Background(), config.WithRegion(awsRegion))
	if err != nil {
		log.Printf("warn: failed to load AWS config, using fallback analysis: %v", err)
		return a
	}
	a.bedrockClient = bedrockruntime.NewFromConfig(cfg)
	return a
}

const bedrockModelID = "anthropic.claude-3-haiku-20240307-v1:0"

// Analyze generates a meal analysis for the given user and date.
func (a *Analyzer) Analyze(ctx context.Context, userID string, date string) (*AnalysisResponse, error) {
	summary, err := a.nutritionClient.GetNutrition(ctx, userID, date)
	if err != nil {
		return nil, fmt.Errorf("failed to get nutrition: %w", err)
	}

	if a.bedrockClient != nil {
		resp, err := a.invokeBedrockAnalysis(ctx, summary)
		if err != nil {
			log.Printf("warn: bedrock analysis failed, using fallback: %v", err)
			return a.fallbackAnalysis(summary), nil
		}
		return resp, nil
	}

	return a.fallbackAnalysis(summary), nil
}

type bedrockRequest struct {
	AnthropicVersion string           `json:"anthropic_version"`
	MaxTokens        int              `json:"max_tokens"`
	Messages         []bedrockMessage `json:"messages"`
}

type bedrockMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type bedrockResponse struct {
	Content []struct {
		Text string `json:"text"`
	} `json:"content"`
}

func (a *Analyzer) invokeBedrockAnalysis(ctx context.Context, summary *model.NutritionSummary) (*AnalysisResponse, error) {
	prompt := buildPrompt(summary)

	reqBody, err := json.Marshal(bedrockRequest{
		AnthropicVersion: "bedrock-2023-05-31",
		MaxTokens:        512,
		Messages: []bedrockMessage{
			{Role: "user", Content: prompt},
		},
	})
	if err != nil {
		return nil, err
	}

	out, err := a.bedrockClient.InvokeModel(ctx, &bedrockruntime.InvokeModelInput{
		ModelId:     aws.String(bedrockModelID),
		ContentType: aws.String("application/json"),
		Body:        reqBody,
	})
	if err != nil {
		return nil, fmt.Errorf("bedrock InvokeModel: %w", err)
	}

	var resp bedrockResponse
	if err := json.Unmarshal(out.Body, &resp); err != nil {
		return nil, fmt.Errorf("failed to parse bedrock response: %w", err)
	}

	if len(resp.Content) == 0 {
		return nil, fmt.Errorf("empty bedrock response")
	}

	return parseAnalysisText(resp.Content[0].Text), nil
}

func buildPrompt(summary *model.NutritionSummary) string {
	return fmt.Sprintf("あなたは栄養士です。以下の食事記録を分析し、健康的なアドバイスを日本語で簡潔に提供してください。\n\n栄養サマリー（%s）:\n- カロリー: %.0f / %.0fkcal（%s）\n- タンパク質: %.1f / %.1fg（%s）\n- 脂質: %.1f / %.1fg（%s）\n- 炭水化物: %.1f / %.1fg（%s）\n\n以下のJSON形式で回答してください:\n{\"analysis\": \"全体的な評価（1-2文）\", \"suggestions\": [\"改善提案1\", \"改善提案2\", \"改善提案3\"]}",
		summary.Date,
		summary.Calories.Actual, summary.Calories.Target, statusLabel(summary.Calories.Status),
		summary.Protein.Actual, summary.Protein.Target, statusLabel(summary.Protein.Status),
		summary.Fat.Actual, summary.Fat.Target, statusLabel(summary.Fat.Status),
		summary.Carbs.Actual, summary.Carbs.Target, statusLabel(summary.Carbs.Status),
	)
}

func statusLabel(s model.NutritionStatus) string {
	switch s {
	case model.StatusDeficient:
		return "不足"
	case model.StatusAdequate:
		return "適量"
	case model.StatusExcessive:
		return "過多"
	default:
		return string(s)
	}
}

func parseAnalysisText(text string) *AnalysisResponse {
	text = strings.TrimSpace(text)

	var resp AnalysisResponse
	if err := json.Unmarshal([]byte(text), &resp); err == nil {
		return &resp
	}

	if idx := strings.Index(text, "{"); idx >= 0 {
		if end := strings.LastIndex(text, "}"); end > idx {
			if err := json.Unmarshal([]byte(text[idx:end+1]), &resp); err == nil {
				return &resp
			}
		}
	}

	return &AnalysisResponse{
		Analysis:    text,
		Suggestions: []string{},
	}
}

func (a *Analyzer) fallbackAnalysis(summary *model.NutritionSummary) *AnalysisResponse {
	var issues []string
	var suggestions []string

	if summary.Calories.Status == model.StatusDeficient {
		issues = append(issues, "カロリーが不足")
		suggestions = append(suggestions, "おにぎりやパンなどエネルギー源となる食品を追加しましょう")
	}
	if summary.Calories.Status == model.StatusExcessive {
		issues = append(issues, "カロリーが過多")
		suggestions = append(suggestions, "サラダやスープなど低カロリーな食品に置き換えてみましょう")
	}
	if summary.Protein.Status == model.StatusDeficient {
		issues = append(issues, "タンパク質が不足")
		suggestions = append(suggestions, "サラダチキンやゆで卵などタンパク質豊富な食品を取り入れましょう")
	}
	if summary.Fat.Status == model.StatusExcessive {
		issues = append(issues, "脂質が過多")
		suggestions = append(suggestions, "揚げ物を控え、蒸し料理やサラダを選びましょう")
	}
	if summary.Carbs.Status == model.StatusDeficient {
		issues = append(issues, "炭水化物が不足")
		suggestions = append(suggestions, "おにぎりやサンドイッチで炭水化物を補いましょう")
	}
	if summary.Carbs.Status == model.StatusExcessive {
		issues = append(issues, "炭水化物が過多")
		suggestions = append(suggestions, "主食の量を減らし、おかずやサラダの比率を増やしましょう")
	}

	var analysis string
	if len(issues) == 0 {
		analysis = "本日の栄養バランスは良好です。この調子で継続しましょう。"
		suggestions = append(suggestions, "バランスの良い食事を続けましょう", "水分補給も忘れずに")
	} else {
		analysis = fmt.Sprintf("本日は%sの傾向があります。バランスの改善を意識しましょう。", strings.Join(issues, "、"))
	}

	return &AnalysisResponse{
		Analysis:    analysis,
		Suggestions: suggestions,
	}
}
