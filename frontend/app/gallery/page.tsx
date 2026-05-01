"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCreatedArtworks, deleteArtwork } from '../../lib/indexedDb';
import styles from './GalleryPage.module.css';

type Artwork = {
  id: number;
  title: string | null;
  artist: string | null;
  image_url: string | null;
  original_image_url?: string | null;
  emotion_category?: string;
  emotion_scores?: string;
  likedAt?: string;
};

const LIKED_ARTWORKS_KEY = 'likedArtworks';

export default function GalleryPage() {
  const router = useRouter();
  const [likedArtworks, setLikedArtworks] = useState<Artwork[]>([]);
  const [createdArtworks, setCreatedArtworks] = useState<Artwork[]>([]);
  const [showOriginal, setShowOriginal] = useState(false);
  const [selectedCreated, setSelectedCreated] = useState<Set<number>>(new Set());
  const [selectedLiked, setSelectedLiked] = useState<Set<number>>(new Set());
  const [pendingDeleteGallery, setPendingDeleteGallery] = useState<'created' | 'liked' | null>(null);
  const [artworkToOpen, setArtworkToOpen] = useState<Artwork | null>(null);

  const toggleSelectCreated = (id: number) => {
    const updated = new Set(selectedCreated);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedCreated(updated);
  };

  const toggleSelectLiked = (id: number) => {
    const updated = new Set(selectedLiked);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedLiked(updated);
  };

  const handleDeleteSelected = (gallery: 'created' | 'liked') => {
    setPendingDeleteGallery(gallery);
  };

  const confirmDeleteSelected = async () => {
    if (pendingDeleteGallery === null) return;

    try {
      if (pendingDeleteGallery === 'created') {
        for (const id of selectedCreated) {
          await deleteArtwork(id);
        }
        setCreatedArtworks(createdArtworks.filter(artwork => !selectedCreated.has(artwork.id)));
        setSelectedCreated(new Set());
      } else if (pendingDeleteGallery === 'liked') {
        const updated = likedArtworks.filter(artwork => !selectedLiked.has(artwork.id));
        setLikedArtworks(updated);
        localStorage.setItem(LIKED_ARTWORKS_KEY, JSON.stringify(updated));
        setSelectedLiked(new Set());
      }
    } catch (error) {
      console.error('Failed to delete artworks:', error);
    } finally {
      setPendingDeleteGallery(null);
    }
  };

  const cancelDelete = () => {
    setPendingDeleteGallery(null);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const openPaintingDetails = (artwork: Artwork) => {
    const encodedArtwork = encodeURIComponent(JSON.stringify(artwork));
    router.push(`/artworks/paintingdetails?id=${artwork.id}&data=${encodedArtwork}`);
  };

  const openPaintingCanvas = (artwork: Artwork) => {
    setArtworkToOpen(artwork);
  };

  const handleStartFresh = () => {
    if (!artworkToOpen) return;
    const canvasData = {
      id: artworkToOpen.id,
      title: artworkToOpen.title,
      artist: artworkToOpen.artist,
      image_url: artworkToOpen.original_image_url ?? artworkToOpen.image_url,
      original_image_url: artworkToOpen.original_image_url,
      dominant_hue: null,
      emotion_category: artworkToOpen.emotion_category ?? '',
      tags: [],
      is_public_domain: false,
    };
    router.push(`/canvas?id=${artworkToOpen.id}&data=${encodeURIComponent(JSON.stringify(canvasData))}`);
    setArtworkToOpen(null);
  };

  const handleContinuePainting = () => {
    if (!artworkToOpen) return;
    const canvasData = {
      id: artworkToOpen.id,
      title: artworkToOpen.title,
      artist: artworkToOpen.artist,
      image_url: artworkToOpen.original_image_url ?? artworkToOpen.image_url,
      original_image_url: artworkToOpen.original_image_url,
      dominant_hue: null,
      emotion_category: artworkToOpen.emotion_category ?? '',
      tags: [],
      is_public_domain: false,
    };
    router.push(`/canvas?id=${artworkToOpen.id}&data=${encodeURIComponent(JSON.stringify(canvasData))}&resume=true`);
    setArtworkToOpen(null);
  };

  useEffect(() => {
    const storedLikedArtworks = localStorage.getItem(LIKED_ARTWORKS_KEY);
    if (storedLikedArtworks) {
      setLikedArtworks(JSON.parse(storedLikedArtworks));
    }

    getCreatedArtworks().then(artworks => {
      setCreatedArtworks(artworks);
    }).catch(error => {
      console.error('Failed to load created artworks:', error);
    });
  }, []);

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Gallery</h1>

      <section className={styles.gallerySection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Created Gallery</h2>
          <button
            className={styles.toggleButton}
            onClick={() => setShowOriginal(!showOriginal)}
          >
            {showOriginal ? "Show My Paintings" : "Show Originals"}
          </button>
          <button
            className={`${styles.deleteGalleryButton} ${selectedCreated.size > 0 ? styles.deleteGalleryButtonActive : ''}`}
            onClick={() => handleDeleteSelected('created')}
            disabled={selectedCreated.size === 0}
          >
            {selectedCreated.size > 0 ? 'delete' : 'select painting(s) for deletion'}
          </button>
        </div>
        {createdArtworks.length > 0 ? (
          <div className={styles.artGrid}>
            {createdArtworks.map((artwork) => (
              <div
                key={artwork.id}
                className={styles.artCard}
                onClick={() => openPaintingCanvas(artwork)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.artImageContainer}>
                  <img
                    src={(showOriginal && artwork.original_image_url) ? artwork.original_image_url : (artwork.image_url ?? '')}
                    alt={artwork.title ?? 'Artwork'}
                    className={styles.artImage}
                  />
                </div>
                <div className={styles.artInfo}>
                  <h3 className={styles.artTitle}>{artwork.title}</h3>
                  <p className={styles.artArtist}>{artwork.artist}</p>
                  {showOriginal && <p className={styles.artLabel}>Artist's Original</p>}
                  {!showOriginal && <p className={styles.artLabel}>Your Painting</p>}
                </div>
                <button
                  className={`${styles.selectCheckbox} ${selectedCreated.has(artwork.id) ? styles.selectCheckboxActive : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelectCreated(artwork.id);
                  }}
                  title="Select for deletion"
                >
                  {selectedCreated.has(artwork.id) ? '✓' : ''}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyMessage}>You haven't created any artworks yet.</p>
        )}
      </section>

      <section className={styles.gallerySection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Liked Gallery</h2>
          <button
            className={`${styles.deleteGalleryButton} ${selectedLiked.size > 0 ? styles.deleteGalleryButtonActive : ''}`}
            onClick={() => handleDeleteSelected('liked')}
            disabled={selectedLiked.size === 0}
          >
            {selectedLiked.size > 0 ? 'delete' : 'select painting(s) for deletion'}
          </button>
        </div>
        {likedArtworks.length > 0 ? (
          <div className={styles.artGrid}>
            {likedArtworks.map((artwork) => (
              <div
                key={artwork.id}
                className={styles.artCard}
                onClick={() => openPaintingDetails(artwork)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.artImageContainer}>
                  <img src={artwork.image_url ?? ''} alt={artwork.title ?? 'Artwork'} className={styles.artImage} />
                </div>
                <div className={styles.artInfo}>
                  <h3 className={styles.artTitle}>{artwork.title}</h3>
                  <p className={styles.artArtist}>{artwork.artist}</p>
                  {artwork.emotion_scores && (
                    <p className={styles.artMetadata}>Emotions: {artwork.emotion_scores}</p>
                  )}
                  {artwork.likedAt && <p className={styles.artMetadata}>Liked on {formatDate(artwork.likedAt)}</p>}
                </div>
                <button
                  className={`${styles.selectCheckbox} ${selectedLiked.has(artwork.id) ? styles.selectCheckboxActive : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelectLiked(artwork.id);
                  }}
                  title="Select for deletion"
                >
                  {selectedLiked.has(artwork.id) ? '✓' : ''}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyMessage}>You haven't liked any artworks yet.</p>
        )}
      </section>

      {pendingDeleteGallery !== null && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Delete Artworks?</h3>
            <p className={styles.modalText}>
              Are you sure you want to delete {pendingDeleteGallery === 'created' ? selectedCreated.size : selectedLiked.size} artwork(s)? This action cannot be undone.
            </p>
            <div className={styles.modalButtons}>
              <button className={styles.modalCancelButton} onClick={cancelDelete}>
                Cancel
              </button>
              <button className={styles.modalConfirmButton} onClick={confirmDeleteSelected}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {artworkToOpen !== null && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Open Painting</h3>
            <p className={styles.modalText}>
              Would you like to continue your previous painting, or start fresh on the original?
            </p>
            <div className={styles.modalButtons}>
              <button className={styles.modalCancelButton} onClick={() => setArtworkToOpen(null)}>
                Cancel
              </button>
              <button className={styles.modalCancelButton} onClick={handleStartFresh}>
                Start Fresh
              </button>
              <button className={styles.modalConfirmButton} onClick={handleContinuePainting}>
                Continue Painting
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}