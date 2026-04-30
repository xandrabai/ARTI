"use client";

import { useState, useEffect } from 'react';
import { getCreatedArtworks } from '../../lib/indexedDb';
import styles from './GalleryPage.module.css';

type Artwork = {
  id: number;
  title: string | null;
  artist: string | null;
  image_url: string | null;
};

const LIKED_ARTWORKS_KEY = 'likedArtworks';
const CREATED_ARTWORKS_KEY = 'createdArtworks';

export default function GalleryPage() {
  const [likedArtworks, setLikedArtworks] = useState<Artwork[]>([]);
  const [createdArtworks, setCreatedArtworks] = useState<Artwork[]>([]);

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
        <h2 className={styles.sectionTitle}>Created Gallery</h2>
        {createdArtworks.length > 0 ? (
          <div className={styles.artGrid}>
            {createdArtworks.map((artwork) => (
              <div key={artwork.id} className={styles.artCard}>
                <img src={artwork.image_url ?? ''} alt={artwork.title ?? 'Artwork'} className={styles.artImage} />
                <div className={styles.artInfo}>
                  <h3 className={styles.artTitle}>{artwork.title}</h3>
                  <p className={styles.artArtist}>{artwork.artist}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyMessage}>You haven't created any artworks yet.</p>
        )}
      </section>

      <section className={styles.gallerySection}>
        <h2 className={styles.sectionTitle}>Liked Gallery</h2>
        {likedArtworks.length > 0 ? (
          <div className={styles.artGrid}>
            {likedArtworks.map((artwork) => (
              <div key={artwork.id} className={styles.artCard}>
                <img src={artwork.image_url ?? ''} alt={artwork.title ?? 'Artwork'} className={styles.artImage} />
                <div className={styles.artInfo}>
                  <h3 className={styles.artTitle}>{artwork.title}</h3>
                  <p className={styles.artArtist}>{artwork.artist}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyMessage}>You haven't liked any artworks yet.</p>
        )}
      </section>
    </main>
  );
}

