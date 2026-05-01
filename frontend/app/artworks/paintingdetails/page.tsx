"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./PaintingDetailsPage.module.css";

type SuggestedArtwork = {
  id: number;
  title: string | null;
  artist: string | null;
  image_url: string | null;
  dominant_hue: number | null;
  emotion_category: string;
  emotion_scores?: string;
  tags: string[];
  is_public_domain: boolean;
};

const parseArtwork = (serializedArtwork: string | null): SuggestedArtwork | null => {
  if (!serializedArtwork) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(serializedArtwork)) as SuggestedArtwork;

    if (typeof parsed?.id !== "number") {
      return null;
    }

    return {
      id: parsed.id,
      title: parsed.title ?? null,
      artist: parsed.artist ?? null,
      image_url: parsed.image_url ?? null,
      dominant_hue: typeof parsed.dominant_hue === "number" ? parsed.dominant_hue : null,
      emotion_category: parsed.emotion_category ?? "",
      emotion_scores: parsed.emotion_scores ?? undefined,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      is_public_domain: Boolean(parsed.is_public_domain),
    };
  } catch {
    return null;
  }
};

const hueToColorName = (hue: number | null): string => {
  if (hue === null) {
    return "Gallery Neutrals";
  }

  if (hue < 20 || hue >= 340) return "Warm Crimson";
  if (hue < 45) return "Amber Gold";
  if (hue < 70) return "Olive Ochre";
  if (hue < 160) return "Sage Green";
  if (hue < 210) return "Cerulean";
  if (hue < 260) return "Indigo";
  if (hue < 300) return "Violet";
  return "Rosewood";
};

const hueToSwatch = (hue: number | null): string => {
  if (hue === null) {
    return "#8D7B68";
  }

  return `hsl(${Math.round(hue)} 60% 48%)`;
};

export default function PaintingDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const artwork = useMemo(
    () => parseArtwork(searchParams.get("data")),
    [searchParams]
  );

  const openPaintingCanvas = (artworkToOpen: SuggestedArtwork | null) => {
    if (!artworkToOpen) return;
    const encodedArtwork = encodeURIComponent(JSON.stringify(artworkToOpen));
    router.push(`/canvas?id=${artworkToOpen.id}&data=${encodedArtwork}`);
  };

  const tags = artwork?.tags?.length ? artwork.tags.slice(0, 3) : ["Renaissance", "Religious Art", "Tempera"];
  const title = artwork?.title ?? "Untitled Artwork";
  const artist = artwork?.artist ?? "Unknown Artist";
  const dominantColorName = hueToColorName(artwork?.dominant_hue ?? null);
  const dominantColorSwatch = hueToSwatch(artwork?.dominant_hue ?? null);

  return (
    <main className={styles.page}>
      <section className={styles.headerBlock}>
        <h1 className={styles.mainTitle}>Discover Your Soul&apos;s Connection</h1>
        <p className={styles.mainSubtitle}>
          Experience the timeless beauty of classical art and find the piece that speaks to your heart
        </p>
      </section>

      <section className={styles.contentGrid}>
        <article className={styles.previewCard}>
          <div className={styles.previewImageWrap}>
            {artwork?.image_url ? (
              <img src={artwork.image_url} alt={title} className={styles.previewImage} />
            ) : (
              <div className={styles.previewFallback}>{title}</div>
            )}
            <button type="button" className={styles.previewSaveButton} aria-label="Save this artwork">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M12 2.6 14.3 7.2l5.1.8-3.7 3.6.9 5.1L12 14.5l-4.6 2.2.9-5.1L4.6 8l5.1-.8L12 2.6Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </article>

        <article className={styles.detailsCard}>
          <h2 className={styles.artTitle}>{title}</h2>
          <p className={styles.artistName}>by {artist}</p>

          <div className={styles.tagRow}>
            {tags.map((tag) => (
              <span key={tag} className={styles.tagChip}>
                {tag}
              </span>
            ))}
          </div>

          <div className={styles.factList}>
            <div className={styles.factItem}>
              <span className={styles.factIcon}>M</span>
              <div>
                <p className={styles.factLabel}>Medium</p>
                <p className={styles.factValue}>{artwork?.tags?.[0] ?? "Tempera on wood"}</p>
              </div>
            </div>

            <div className={styles.factItem}>
              <span className={styles.factIcon}>Y</span>
              <div>
                <p className={styles.factLabel}>Created</p>
                <p className={styles.factValue}>{artwork?.is_public_domain ? "c. 1400-1410" : "Date not listed"}</p>
              </div>
            </div>

            <div className={styles.factItem}>
              <span className={styles.factIcon} style={{ backgroundColor: dominantColorSwatch }}>
                C
              </span>
              <div>
                <p className={styles.factLabel}>Dominant Colors</p>
                <p className={styles.factValue}>{dominantColorName}</p>
              </div>
            </div>
          </div>

          <details className={styles.moreDetails}>
            <summary>Show Details</summary>
            <p>
              Emotional category: {artwork?.emotion_category || "balanced"}. This recommendation is based on your
              vibe input and matched against our curated artwork records in the database.
            </p>
          </details>

          <div className={styles.actionRow}>
            <button type="button" className={styles.primaryAction} onClick={() => openPaintingCanvas(artwork)}>
              <span aria-hidden="true">&lt;3</span>
              <span>This is the one!</span>
            </button>
            <button
              type="button"
              className={styles.shareAction}
              aria-label="Share artwork"
              onClick={async () => {
                const shareData = {
                  title,
                  text: `Take a look at ${title} by ${artist}`,
                  url: window.location.href,
                };

                if (navigator.share) {
                  try {
                    await navigator.share(shareData);
                    return;
                  } catch {
                    // User canceled share; fall through to clipboard fallback.
                  }
                }

                await navigator.clipboard.writeText(window.location.href);
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M15.5 5a2.5 2.5 0 1 0 2.4 3.1l-6 3.1a2.5 2.5 0 1 0 0 1.6l6 3.1a2.5 2.5 0 1 0 .7-1.4l-6.3-3.3 6.3-3.3A2.5 2.5 0 0 0 15.5 5Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </article>
      </section>

      <button
        type="button"
        className={styles.returnButton}
        onClick={() => {
          if (window.history.length > 1) {
            router.back();
            return;
          }

          router.push("/artworks");
        }}
      >
        return
      </button>
    </main>
  );
}
