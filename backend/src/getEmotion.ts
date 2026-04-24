const HUGGING_FACE_API_URL =
  "https://router.huggingface.co/hf-inference/models/j-hartmann/emotion-english-distilroberta-base";

type HuggingFaceEmotion = {
  label: string;
  score: number;
};

const MODEL_LABELS = ["anger", "disgust", "fear", "joy", "neutral", "sadness", "surprise"] as const;

export type EmotionScore = {
  emotion: string;
  score: number;
};

const normalizeEmotion = (emotion: string): string => {
  if (!emotion) {
    return emotion;
  }

  return emotion.charAt(0).toUpperCase() + emotion.slice(1).toLowerCase();
};

export const getEmotion = async (text: string): Promise<EmotionScore[]> => {
  const token = process.env.HF_TOKEN;

  if (!token) {
    throw new Error("HF_TOKEN is missing. Add it in backend/.env");
  }

  const response = await fetch(HUGGING_FACE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: text,
        parameters: {"return_all_scores": true}
     }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Hugging Face request failed (${response.status}): ${details}`);
  }

  const payload = (await response.json()) as HuggingFaceEmotion[][] | HuggingFaceEmotion[];
  const rawScores = Array.isArray(payload[0])
    ? (payload as HuggingFaceEmotion[][])[0]
    : (payload as HuggingFaceEmotion[]);

  const scoreByLabel = new Map(
    rawScores.map((item) => [item.label.toLowerCase(), Number(item.score.toFixed(4))])
  );

  return MODEL_LABELS
    .map((label) => ({
      emotion: normalizeEmotion(label),
      score: scoreByLabel.get(label) ?? 0, //
    }))
    .sort((a, b) => b.score - a.score);
};
