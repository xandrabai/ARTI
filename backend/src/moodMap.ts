export const moodMap = {
  joy: {
    keyword: "vibrant sunlight impressionism",
    dominantColor: "#F6C945",
  },
  sadness: {
    keyword: "rainy blue solitude painting",
    dominantColor: "#4A6FA5",
  },
  anger: {
    keyword: "fiery abstract expressionism",
    dominantColor: "#C0392B",
  },
  fear: {
    keyword: "shadowy cinematic surrealism",
    dominantColor: "#5B4B8A",
  },
  surprise: {
    keyword: "dynamic surreal pop art",
    dominantColor: "#FF8C42",
  },
  disgust: {
    keyword: "distorted dark green expressionism",
    dominantColor: "#3E7A4E",
  },
  neutral: {
    keyword: "minimal calm contemporary art",
    dominantColor: "#9AA0A6",
  },
} as const;

export type MoodKey = keyof typeof moodMap;
export type MoodValue = (typeof moodMap)[MoodKey];