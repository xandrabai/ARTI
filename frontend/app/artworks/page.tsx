"use client";
import { useEffect, useState } from 'react';
import styles from './ArtworkPage.module.css';

type SuggestedArtwork = {
  id: number;
  title: string | null;
  artist: string | null;
  image_url: string | null;
  dominant_hue: number | null;
  emotion_category: string;
  tags: string[];
  is_public_domain: boolean;
};

const ArtworkPage = () => {
  const [text, setText] = useState('');

  const [artworks, setArtworks] = useState<SuggestedArtwork[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const fetchSuggestions = async (inputText: string) => {
    setIsLoading(true);
    setSubmitError('');

    try {
      const response = await fetch('http://localhost:4000/api/process-vibe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? 'Failed to fetch artwork suggestions.');
      }

      const payload = (await response.json()) as {
        artworks?: SuggestedArtwork[];
      };

      setArtworks(payload.artworks ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch artwork suggestions.';
      setSubmitError(message);
      setArtworks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextText = params.get('text')?.trim() ?? '';

    if (!nextText) {
      window.location.replace('/');
      return;
    }

    setText(nextText);
  }, []);

  useEffect(() => {
    if (!text) {
      return;
    }

    void fetchSuggestions(text);
  }, [text]);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>What catches your soul? Tap to choose</h1>
      <p className={styles.subtitle}>
        Discover the perfect piece that speaks to your heart from our curated collection
        of artistic masterpieces
      </p>

      {submitError ? <p className={styles.errorText}>{submitError}</p> : null}

      {artworks.length > 0 ? (
        <div className={styles.galleryGrid}>
          {artworks.map((artwork) => (
            <article key={artwork.id} className={styles.artCard}>
              <button type="button" className={styles.favoriteButton} aria-label="Save this piece">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09A6 6 0 0 1 16.5 3C19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35Z"
                    fill="currentColor"
                  />
                </svg>
              </button>

              <div className={styles.artImageWrap}>
                {artwork.image_url ? (
                  <img
                    src={artwork.image_url}
                    alt={artwork.title ? artwork.title : 'Artwork preview'}
                    className={styles.artImage}
                  />
                ) : (
                  <div className={styles.artImagePlaceholder}>No image available</div>
                )}
              </div>

              <div className={styles.artCardBody}>
                <h2 className={styles.artTitle}>{artwork.title ?? 'Untitled Artwork'}</h2>
                <p className={styles.artDescription}>
                  {artwork.artist ? `By ${artwork.artist}` : 'Artist unknown'}
                </p>
                <button type="button" className={styles.selectButton}>
                  <span>Select This Piece</span>
                  <span className={styles.selectCircle} aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        className={styles.shuffleButton}
        onClick={() => void fetchSuggestions(text)}
        disabled={isLoading || !text}
      >
        <span className={styles.shuffleIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
            <path
              d="M17 3h4v4h-2V5.91l-3.04 3.04-1.42-1.42L17.59 4H17V3ZM3 7h4.59l9.83 9.83-1.41 1.41L6.17 8.41H3V7Zm14 10h.59l-3.05-3.05 1.42-1.41L19 15.59V14h2v4h-4v-1ZM3 16h3.17l2.5-2.5 1.41 1.42L7.59 17.41H3V16Zm15.59-8.41 1.41 1.41-2.5 2.5-1.41-1.42 2.5-2.49Z"
              fill="currentColor"
            />
          </svg>
        </span>
        <span>{isLoading ? 'Refreshing...' : 'Refresh Collection'}</span>
      </button>
    </div>
  );
};

export default ArtworkPage;
