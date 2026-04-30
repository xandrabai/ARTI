"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import styles from "./PaintingCanvas.module.css";

type Point = {
  x: number;
  y: number;
};

const LONG_PRESS_MS = 450;
const MOVE_CANCEL_THRESHOLD = 0.008;

type Stroke = {
  color: string;
  size: number;
  points: Point[];
};

type PaintingCanvasProps = {
  imageUrl: string;
  alt?: string;
  defaultColor?: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toHex = (value: number) => value.toString(16).padStart(2, "0");

const rgbToHex = (red: number, green: number, blue: number) => `#${toHex(red)}${toHex(green)}${toHex(blue)}`;

const drawStroke = (context: CanvasRenderingContext2D, stroke: Stroke, width: number, height: number) => {
  const points = stroke.points;
  if (points.length === 0) {
    return;
  }

  context.strokeStyle = stroke.color;
  context.lineWidth = stroke.size;
  context.lineCap = "round";
  context.lineJoin = "round";

  const toPixels = (point: Point) => ({
    x: point.x * width,
    y: point.y * height,
  });

  if (points.length === 1) {
    const point = toPixels(points[0]);
    context.beginPath();
    context.arc(point.x, point.y, stroke.size / 2, 0, Math.PI * 2);
    context.fillStyle = stroke.color;
    context.fill();
    return;
  }

  const first = toPixels(points[0]);
  context.beginPath();
  context.moveTo(first.x, first.y);

  for (let index = 1; index < points.length - 1; index += 1) {
    const current = toPixels(points[index]);
    const next = toPixels(points[index + 1]);
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    context.quadraticCurveTo(current.x, current.y, midX, midY);
  }

  const last = toPixels(points[points.length - 1]);
  context.lineTo(last.x, last.y);
  context.stroke();
};

export type PaintingCanvasRef = {
  getCanvasData: () => string | undefined;
  isDrawing: () => boolean;
};

const PaintingCanvas = forwardRef<PaintingCanvasRef, PaintingCanvasProps>(({
  imageUrl,
  alt = "Painting sketch reference",
  defaultColor = "#8f7758",
}, ref) => {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const pointerDownPointRef = useRef<Point | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const activeStrokeRef = useRef<Stroke | null>(null);

  const [brushColor, setBrushColor] = useState(defaultColor);
  const [brushSize, setBrushSize] = useState(6);
  const [isDrawing, setIsDrawing] = useState(false);

  useImperativeHandle(ref, () => ({
    getCanvasData: () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      const compositeCanvas = document.createElement("canvas");
      compositeCanvas.width = canvas.width;
      compositeCanvas.height = canvas.height;
      const compositeContext = compositeCanvas.getContext("2d");

      if (!compositeContext) {
        return;
      }

      const image = imageRef.current;
      if (image) {
        compositeContext.drawImage(image, 0, 0, canvas.width, canvas.height);
      }

      compositeContext.drawImage(canvas, 0, 0);

      return compositeCanvas.toDataURL("image/png");
    },
    isDrawing: () => isDrawing,
  }));

  useEffect(() => {
    setBrushColor(defaultColor);
  }, [defaultColor]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokesRef.current) {
      drawStroke(context, stroke, canvas.width, canvas.height);
    }

    if (activeStrokeRef.current) {
      drawStroke(context, activeStrokeRef.current, canvas.width, canvas.height);
    }
  }, []);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const pickBrushColorAtPoint = useCallback((point: Point) => {
    const image = imageRef.current;
    if (!image || image.naturalWidth === 0 || image.naturalHeight === 0) {
      return;
    }

    let sampleCanvas = sampleCanvasRef.current;
    if (!sampleCanvas) {
      sampleCanvas = document.createElement("canvas");
      sampleCanvasRef.current = sampleCanvas;
    }

    sampleCanvas.width = image.naturalWidth;
    sampleCanvas.height = image.naturalHeight;

    const sampleContext = sampleCanvas.getContext("2d");
    if (!sampleContext) {
      return;
    }

    sampleContext.clearRect(0, 0, sampleCanvas.width, sampleCanvas.height);
    sampleContext.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight);

    const pixelX = clamp(Math.round(point.x * (image.naturalWidth - 1)), 0, image.naturalWidth - 1);
    const pixelY = clamp(Math.round(point.y * (image.naturalHeight - 1)), 0, image.naturalHeight - 1);

    try {
      const colorData = sampleContext.getImageData(pixelX, pixelY, 1, 1).data;
      setBrushColor(rgbToHex(colorData[0], colorData[1], colorData[2]));
    } catch {
      // Cross-origin image restrictions can block pixel reads.
    }
  }, []);

  const getNormalizedPoint = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): Point | null => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return null;
      }

      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return null;
      }

      const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);

      return { x, y };
    },
    []
  );

  const syncCanvasSize = useCallback(() => {
    const image = imageRef.current;
    const canvas = canvasRef.current;

    if (!image || !canvas) {
      return;
    }

    const width = image.clientWidth;
    const height = image.clientHeight;

    if (width === 0 || height === 0) {
      return;
    }

    if (canvas.width !== width) {
      canvas.width = width;
    }

    if (canvas.height !== height) {
      canvas.height = height;
    }

    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    strokesRef.current = [];
    activeStrokeRef.current = null;
    syncCanvasSize();
    window.addEventListener("resize", syncCanvasSize);

    return () => {
      window.removeEventListener("resize", syncCanvasSize);
      clearLongPressTimer();
    };
  }, [clearLongPressTimer, imageUrl, syncCanvasSize]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    longPressTriggeredRef.current = false;
    pointerDownPointRef.current = getNormalizedPoint(event);

    activeStrokeRef.current = {
      color: brushColor,
      size: brushSize,
      points: pointerDownPointRef.current ? [pointerDownPointRef.current] : [],
    };

    setIsDrawing(true);

    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      if (pointerDownPointRef.current) {
        pickBrushColorAtPoint(pointerDownPointRef.current);
      }
    }, LONG_PRESS_MS);
  }, [brushColor, brushSize, getNormalizedPoint, pickBrushColorAtPoint]);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (longPressTriggeredRef.current) {
        return;
      }

      if (!activeStrokeRef.current) {
        return;
      }

      const point = getNormalizedPoint(event);
      if (!point) {
        return;
      }

      const pointerDownPoint = pointerDownPointRef.current;
      if (pointerDownPoint) {
        const deltaX = point.x - pointerDownPoint.x;
        const deltaY = point.y - pointerDownPoint.y;
        const movement = Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));

        if (movement > MOVE_CANCEL_THRESHOLD) {
          clearLongPressTimer();
        }
      }

      activeStrokeRef.current.points.push(point);
      redrawCanvas();
    },
    [clearLongPressTimer, getNormalizedPoint, redrawCanvas]
  );

  const handlePointerUp = useCallback(() => {
    clearLongPressTimer();

    if (activeStrokeRef.current && activeStrokeRef.current.points.length > 0) {
      strokesRef.current.push(activeStrokeRef.current);
    }

    activeStrokeRef.current = null;
    redrawCanvas();
    setIsDrawing(false);
  }, [clearLongPressTimer, redrawCanvas]);

  const handleUndo = () => {
    if (strokesRef.current.length === 0) {
      return;
    }

    strokesRef.current = strokesRef.current.slice(0, -1);
    redrawCanvas();
  };

  const handleClear = () => {
    strokesRef.current = [];
    activeStrokeRef.current = null;
    redrawCanvas();
  };

  return (
    <div className={styles.canvasWrap}>
      <div className={styles.drawingLayer}>
        <img
          ref={imageRef}
          crossOrigin="anonymous"
          src={imageUrl}
          alt={alt}
          className={styles.sketchImage}
          onLoad={syncCanvasSize}
        />
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          aria-label="Painting drawing canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>

      <div className={styles.brushBar}>
        <label className={styles.controlGroup}>
          <span className={styles.controlLabel}>Color</span>
          <input
            type="color"
            value={brushColor}
            className={styles.colorInput}
            onChange={(event) => setBrushColor(event.target.value)}
          />
        </label>

        <label className={styles.controlGroupWide}>
          <span className={styles.controlLabel}>Brush Size</span>
          <input
            type="range"
            min={1}
            max={36}
            value={brushSize}
            className={styles.slider}
            onChange={(event) => setBrushSize(Number(event.target.value))}
          />
          <span className={styles.sizeValue}>{brushSize}px</span>
        </label>

        <div className={styles.actionGroup}>
          <button type="button" className={styles.secondaryButton} onClick={handleUndo}>
            Undo
          </button>
          <button type="button" className={styles.secondaryButton} onClick={handleClear}>
            Clear
          </button>
        </div>
      </div>
    </div>
  );
});

export default PaintingCanvas;
