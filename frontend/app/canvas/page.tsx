"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PaintingCanvas, { PaintingCanvasRef } from "../../components/PaintingCanvas";
import { saveArtwork, getArtworkById } from "../../lib/indexedDb";
import styles from "./PaintingCanvasPage.module.css";

type SuggestedArtwork = {
  id: number;
  title: string | null;
  artist: string | null;
  image_url: string | null;
  original_image_url?: string | null;
  dominant_hue: number | null;
  emotion_category: string;
  emotion_scores?: string;
  tags: string[];
  is_public_domain: boolean;
};

const hueToBrushColor = (hue: number | null): string => {
  if (hue === null) return "#8f7758";
  return `hsl(${Math.round(hue)} 62% 42%)`;
};

const parseArtwork = (serializedArtwork: string | null): SuggestedArtwork | null => {
  if (!serializedArtwork) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(serializedArtwork)) as SuggestedArtwork;
    if (typeof parsed?.id !== "number") return null;

    return {
      id: parsed.id,
      title: parsed.title ?? null,
      artist: parsed.artist ?? null,
      image_url: parsed.original_image_url ?? parsed.image_url ?? null,
      original_image_url: parsed.original_image_url,
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

export default function PaintingCanvasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canvasRef = useRef<PaintingCanvasRef>(null);
  const [showDontSaveModal, setShowDontSaveModal] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [canvasImageUrl, setCanvasImageUrl] = useState<string | null>(null);
  const [initialDrawing, setInitialDrawing] = useState<string | null>(null);

  const artwork = useMemo(
    () => parseArtwork(searchParams.get("data")),
    [searchParams]
  );

  useEffect(() => {
    const resume = searchParams.get("resume");
    const artworkId = searchParams.get("id");

    // For resume mode, use the original_image_url (reference artwork) as the background
    // For new paintings, use image_url (which parseArtwork sets to original_image_url if available)
    if (resume === "true") {
      setCanvasImageUrl(artwork?.original_image_url ?? artwork?.image_url ?? null);
    } else {
      setCanvasImageUrl(artwork?.image_url ?? null);
    }

    // If resuming, load the user's saved painting strokes to display on the canvas
    if (resume === "true" && artworkId) {
      getArtworkById(Number(artworkId)).then((saved) => {
        if (saved?.image_url) {
          setInitialDrawing(saved.image_url);
        }
      }).catch(() => {
        // If error, just continue without the saved drawing
      });
    }
  }, [artwork]);

  const handleSave = async () => {
    if (!artwork) return;

    const resume = searchParams.get("resume");
    let imageDataUrl: string | undefined;
    
    if (resume === "true") {
      // When resuming, save only the canvas drawing without the reference composite
      imageDataUrl = canvasRef.current?.getCanvasDataOnly();
    } else {
      // For new paintings, composite the reference with the drawing
      imageDataUrl = canvasRef.current?.getCanvasData();
    }
    
    if (!imageDataUrl) return;

    if (typeof window === 'undefined') return;

    const newArtwork = {
      ...artwork,
      id: Date.now(),
      original_image_url: artwork.image_url,
      image_url: imageDataUrl,
    };

    try {
      await saveArtwork(newArtwork);
      router.push('/gallery');
    } catch (error) {
      console.error('Failed to save artwork:', error);
    }
  };

  const handleDontSave = () => {
    setShowDontSaveModal(true);
  };

  const confirmDontSave = () => {
    router.push('/gallery');
  };

  const cancelDontSave = () => {
    setShowDontSaveModal(false);
  };

  useEffect(() => {
    const startAutoSaveTimer = () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(() => {
        if (canvasRef.current?.isDrawing() === false) {
          handleSave();
        }
      }, 5000);
    };

    const handleInteraction = () => {
      startAutoSaveTimer();
    };

    window.addEventListener('pointerdown', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    startAutoSaveTimer();

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      window.removeEventListener('pointerdown', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  const title = artwork?.title ?? "Untitled Artwork";
  const artist = artwork?.artist ?? "Unknown Artist";
  const defaultBrushColor = hueToBrushColor(artwork?.dominant_hue ?? null);

  return (
    <main className={styles.page}>
      <section className={styles.headerBlock}>
        <h1 className={styles.mainTitle}>Painting Canvas</h1>
        <p className={styles.mainSubtitle}>Sketch directly over your selected artwork reference.</p>
      </section>

      <section className={styles.canvasCard}>
        <div className={styles.canvasInfo}>
          <h2 className={styles.artTitle}>{title}</h2>
          <p className={styles.artistName}>by {artist}</p>
        </div>

        <div className={styles.canvasArea}>
          {canvasImageUrl ? (
            <PaintingCanvas ref={canvasRef} imageUrl={canvasImageUrl} alt={title} defaultColor={defaultBrushColor} initialDrawing={initialDrawing ?? undefined} />
          ) : (
            <div className={styles.emptyState}>No image is available for this artwork.</div>
          )}
        </div>
      </section>

      <div className={styles.buttonContainer}>
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
          Return
        </button>
        <button type="button" className={styles.saveButton} onClick={handleSave}>
          Save
        </button>
        <button type="button" className={styles.dontSaveButton} onClick={handleDontSave}>
          Don't Save
        </button>
      </div>

      {showDontSaveModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>Are you sure?</h2>
            <p>If you don't save, your artwork will be lost.</p>
            <div className={styles.modalButtons}>
              <button onClick={confirmDontSave} className={styles.confirmButton}>Yes, Don't Save</button>
              <button onClick={cancelDontSave} className={styles.cancelButton}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}