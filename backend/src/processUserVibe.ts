import { getEmotion } from "./getEmotion.js";
import { moodMap, type MoodKey } from "./moodMap.js";
import { supabase } from "./supabaseClient.js";

const AIC_SEARCH_URL = "https://api.artic.edu/api/v1/artworks/search";
const AIC_IMAGE_BASE_URL = "https://www.artic.edu/iiif/2";

type AicColor = {
  h?: number;
  l?: number;
  s?: number;
};

type AicArtwork = {
  id: number;
  title: string | null;
  artist_title: string | null;
  image_id: string | null;
  color: AicColor | null;
  term_titles: string[] | null;
  is_public_domain: boolean | null;
};

type AicSearchResponse = {
  data?: AicArtwork[];
};

export type EmotionArtworkRecord = {
  id: number;
  title: string | null;
  artist: string | null;
  image_url: string | null;
  dominant_hue: number | null;
  emotion_category: string;
  tags: string[];
  is_public_domain: boolean;
};

const UNKNOWN_COLUMN_ERROR = /Could not find the '([^']+)' column of 'emotion_artworks'/;

const safeUpsertEmotionArtworks = async (records: EmotionArtworkRecord[]): Promise<void> => {
  if (records.length === 0) {
    return;
  }

  let payload: Array<Record<string, unknown>> = records.map((record) => ({ ...record }));
  const removedColumns = new Set<string>();

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { error } = await supabase.from("emotion_artworks").upsert(payload, { onConflict: "id" });

    if (!error) {
      return;
    }

    const unknownColumnMatch = error.message.match(UNKNOWN_COLUMN_ERROR);
    const unknownColumn = unknownColumnMatch?.[1];

    if (!unknownColumn || removedColumns.has(unknownColumn)) {
      throw new Error(`Supabase upsert failed: ${error.message}`);
    }

    removedColumns.add(unknownColumn);
    payload = payload.map((record) => {
      const nextRecord = { ...record };
      delete nextRecord[unknownColumn];
      return nextRecord;
    });
  }

  throw new Error("Supabase upsert failed after schema fallback attempts.");
};

const buildAicImageUrl = (imageId: string | null): string | null => {
  if (!imageId) {
    return null;
  }

  return `${AIC_IMAGE_BASE_URL}/${imageId}/full/843,/0/default.jpg`;
};

const shuffleArray = <T,>(items: T[]): T[] => {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const temp = shuffled[index];
    shuffled[index] = shuffled[randomIndex];
    shuffled[randomIndex] = temp;
  }

  return shuffled;
};

const formatArtworkForSupabase = (
  artwork: AicArtwork,
  emotion: MoodKey
): EmotionArtworkRecord => {
  return {
    id: artwork.id,
    title: artwork.title,
    artist: artwork.artist_title,
    image_url: buildAicImageUrl(artwork.image_id),
    dominant_hue:
      typeof artwork.color?.h === "number"
        ? Math.round(artwork.color.h)
        : null,
    emotion_category: emotion,
    tags: artwork.term_titles ?? [],
    is_public_domain: Boolean(artwork.is_public_domain),
  };
};

export const processUserVibe = async (text: string): Promise<EmotionArtworkRecord[]> => {
  const cleanedText = text.trim();
  if (!cleanedText) {
    throw new Error("text is required");
  }

  const requestTime = new Date().toISOString();
  console.log(`[${requestTime}] [processUserVibe] input: ${cleanedText}`);

  const emotions = await getEmotion(cleanedText);
  const emotionPreview = emotions
    .slice(0, 7)
    .map((item) => `${item.emotion}:${item.score}`)
    .join(", ");
  console.log(`[${requestTime}] [processUserVibe] huggingface output: ${emotionPreview}`);

  const topEmotion = emotions[0];

  if (!topEmotion) {
    throw new Error("No emotion returned from inference.");
  }

  const moodKey = topEmotion.emotion.toLowerCase() as MoodKey;
  const moodConfig = moodMap[moodKey];

  if (!moodConfig) {
    throw new Error(`No mood mapping found for emotion: ${topEmotion.emotion}`);
  }

  const aicUrl = new URL(AIC_SEARCH_URL);
  aicUrl.searchParams.set("q", moodConfig.keyword);
  aicUrl.searchParams.set(
    "fields",
    "id,title,artist_title,image_id,color,term_titles,is_public_domain"
  );
  aicUrl.searchParams.set("limit", "12");

  console.log(
    `[${requestTime}] [processUserVibe] artwork retrieval: querying AIC with keyword "${moodConfig.keyword}"`
  );

  const aicResponse = await fetch(aicUrl.toString());
  if (!aicResponse.ok) {
    const details = await aicResponse.text();
    throw new Error(`AIC search failed (${aicResponse.status}): ${details}`);
  }

  const aicPayload = (await aicResponse.json()) as AicSearchResponse;
  const formattedArtworks = (aicPayload.data ?? [])
    .filter((item) => Boolean(item.image_id))
    .map((artwork) => formatArtworkForSupabase(artwork, moodKey));

  console.log(
    `[${requestTime}] [processUserVibe] artwork retrieval: received ${formattedArtworks.length} artworks with images`
  );

  if (formattedArtworks.length === 0) {
    return [];
  }

  await safeUpsertEmotionArtworks(formattedArtworks);
  console.log(
    `[${requestTime}] [processUserVibe] artwork retrieval: upserted ${formattedArtworks.length} artworks into emotion_artworks`
  );

  return shuffleArray(formattedArtworks).slice(0, 3);
};