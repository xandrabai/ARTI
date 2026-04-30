"use client";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './FeelingPage.module.css';

type SpeechRecognitionAlternative = {
  transcript: string;
};

type SpeechRecognitionResult = ArrayLike<SpeechRecognitionAlternative> & {
  isFinal?: boolean;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResult>;
  resultIndex: number;
};

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructorLike = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructorLike;
    webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
  }
}

const emotions = ["Anxiety", "Overwhelmed", "Grief", "Rage", "Numbness", "Shame", "self-blame"];

const FeelingPage = () => {
  const router = useRouter();
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const shouldKeepListeningRef = useRef(true);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const baseTextRef = useRef('');
  const committedVoiceTextRef = useRef('');

  useEffect(() => {
    const savedInput = sessionStorage.getItem('createPageInput');
    if (savedInput) {
      setInputValue(savedInput);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem('createPageInput', inputValue);
  }, [inputValue]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const value = inputValue.trim();
    if (!value) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const query = new URLSearchParams({ text: value }).toString();
            router.push(`/artworks?text=${encodeURIComponent(inputValue)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to continue to artwork page.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoiceInput = () => {
    if (isListening) {
      shouldKeepListeningRef.current = false;
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice input is only supported in browsers with Speech Recognition, like Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    baseTextRef.current = inputValue.trim();
    committedVoiceTextRef.current = '';
    shouldKeepListeningRef.current = true;

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const firstAlternative = result?.[0];

        if (firstAlternative) {
          if (result?.isFinal) {
            finalTranscript += firstAlternative.transcript;
          } else {
            interimTranscript += firstAlternative.transcript;
          }
        }
      }

      if (finalTranscript.trim()) {
        committedVoiceTextRef.current = [committedVoiceTextRef.current, finalTranscript.trim()]
          .filter(Boolean)
          .join(' ');
      }

      setInputValue(
        [baseTextRef.current, committedVoiceTextRef.current, interimTranscript.trim()]
          .filter(Boolean)
          .join(' ')
      );
    };

    recognition.onerror = () => {
      shouldKeepListeningRef.current = false;
      setIsListening(false);
    };

    recognition.onend = () => {
      if (shouldKeepListeningRef.current) {
        recognition.start();
        return;
      }

      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  useEffect(() => {
    return () => {
      shouldKeepListeningRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    const textArea = textAreaRef.current;
    if (!textArea) {
      return;
    }

    textArea.style.height = 'auto';

    const computedStyles = window.getComputedStyle(textArea);
    const lineHeight = Number.parseFloat(computedStyles.lineHeight) || 20;
    const maxHeight = lineHeight * 4;
    const nextHeight = Math.min(textArea.scrollHeight, maxHeight);

    textArea.style.height = `${nextHeight}px`;
    textArea.style.overflowY = textArea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [inputValue]);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>How are you feeling right now?</h1>
      <p className={styles.subtitle}>
        Share your emotions and let me find the perfect artwork for your soul
      </p>
      <form className={styles.inputArea} onSubmit={handleSubmit}>
        <textarea
          ref={textAreaRef}
          className={styles.textInput}
          placeholder="Describe your feelings in words..."
          value={inputValue}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInputValue(e.target.value)}
          rows={1}
        />
        <button
          type="button"
          onClick={handleVoiceInput}
          disabled={isSubmitting}
          className={`${styles.voiceButton} ${isListening ? styles.voiceButtonActive : ''}`}
          aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
        >
          <span className={styles.buttonIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V20H8v2h8v-2h-3v-2.08A7 7 0 0 0 19 11h-2Z" fill="currentColor" />
            </svg>
          </span>
          <span>{isListening ? 'Listening' : 'Voice'}</span>
        </button>
        <button type="submit" className={styles.submitButton} aria-label="Submit your feeling" disabled={isSubmitting}>
          <span>Enter</span>
          <span className={styles.buttonIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path d="M5 12h11.17l-4.58-4.59L13 6l7 7-7 7-1.41-1.41L16.17 13H5v-1Z" fill="currentColor" />
            </svg>
          </span>
        </button>
      </form>
      {submitError ? <p className={styles.errorText}>{submitError}</p> : null}
      <p className={styles.tagline}>
        You are creating a cozy, private, and healing world of your own.
      </p>
      <div className={styles.emotionButtons}>
        {emotions.map((emotion) => (
          <button key={emotion} type="button" className={styles.emotionButton} onClick={() => setInputValue(emotion)}>
            {emotion}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FeelingPage;
