"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Pencil,
  Eraser,
  Undo2,
  Trash2,
} from "lucide-react";

interface WhiteBoardProps {
  initialContent: string;
  onChange: (content: string) => void;
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  color: string;
  width: number;
  points: Point[];
}

const COLORS = [
  "#111827",
  "#2563eb",
  "#7c3aed",
  "#dc2626",
  "#059669",
  "#f59e0b",
];

const INITIAL_CONTENT_KEY = Symbol("initial-content");

export default function WhiteBoard({
  initialContent,
  onChange,
}: WhiteBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);

  const isDrawingRef = useRef(false);
  const initializedRef = useRef(false);

  const [color, setColor] = useState("#111827");
  const [brushSize, setBrushSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);

  // ==========================================
  // DRAW STROKES
  // ==========================================

  const drawStroke = useCallback(
    (
      context: CanvasRenderingContext2D,
      stroke: Stroke,
      width: number,
      height: number
    ) => {
      if (stroke.points.length === 0) return;

      context.strokeStyle = stroke.color;
      context.lineWidth = stroke.width;
      context.lineCap = "round";
      context.lineJoin = "round";

      context.beginPath();

      context.moveTo(
        stroke.points[0].x * width,
        stroke.points[0].y * height
      );

      if (stroke.points.length === 1) {
        context.lineTo(
          stroke.points[0].x * width + 0.1,
          stroke.points[0].y * height + 0.1
        );
      } else {
        for (let index = 1; index < stroke.points.length; index++) {
          const point = stroke.points[index];

          context.lineTo(
            point.x * width,
            point.y * height
          );
        }
      }

      context.stroke();
    },
    []
  );

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const context = canvas.getContext("2d");

    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;

    context.setTransform(
      pixelRatio,
      0,
      0,
      pixelRatio,
      0,
      0
    );

    context.clearRect(0, 0, rect.width, rect.height);

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, rect.width, rect.height);

    for (const stroke of strokesRef.current) {
      drawStroke(
        context,
        stroke,
        rect.width,
        rect.height
      );
    }

    if (currentStrokeRef.current) {
      drawStroke(
        context,
        currentStrokeRef.current,
        rect.width,
        rect.height
      );
    }
  }, [drawStroke]);

  // ==========================================
  // INITIALIZE SAVED CONTENT
  // ==========================================

  useEffect(() => {
    if (initializedRef.current) return;

    try {
      const parsed = JSON.parse(initialContent || "[]");

      if (Array.isArray(parsed)) {
        strokesRef.current = parsed.filter(
          (stroke): stroke is Stroke =>
            stroke &&
            typeof stroke.color === "string" &&
            typeof stroke.width === "number" &&
            Array.isArray(stroke.points)
        );
      }
    } catch (error) {
      console.error(
        "Unable to load saved whiteboard content:",
        error
      );

      strokesRef.current = [];
    }

    initializedRef.current = true;
    redraw();
  }, [initialContent, redraw]);

  // ==========================================
  // RESIZE CANVAS
  // ==========================================

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = window.devicePixelRatio || 1;

      canvas.width = Math.max(
        1,
        Math.round(rect.width * pixelRatio)
      );

      canvas.height = Math.max(
        1,
        Math.round(rect.height * pixelRatio)
      );

      redraw();
    };

    resizeCanvas();

    const observer = new ResizeObserver(resizeCanvas);

    observer.observe(canvas);

    return () => observer.disconnect();
  }, [redraw]);

  // ==========================================
  // POINTER COORDINATES
  // ==========================================

  const getPoint = (
    event: React.PointerEvent<HTMLCanvasElement>
  ): Point => {
    const rect = event.currentTarget.getBoundingClientRect();

    return {
      x: Math.max(
        0,
        Math.min(1, (event.clientX - rect.left) / rect.width)
      ),
      y: Math.max(
        0,
        Math.min(1, (event.clientY - rect.top) / rect.height)
      ),
    };
  };

  // ==========================================
  // START DRAWING
  // ==========================================

  const startDrawing = (
    event: React.PointerEvent<HTMLCanvasElement>
  ) => {
    event.currentTarget.setPointerCapture(event.pointerId);

    isDrawingRef.current = true;

    currentStrokeRef.current = {
      color: isEraser ? "#ffffff" : color,
      width: isEraser ? brushSize * 5 : brushSize,
      points: [getPoint(event)],
    };

    redraw();
  };

  // ==========================================
  // DRAW
  // ==========================================

  const draw = (
    event: React.PointerEvent<HTMLCanvasElement>
  ) => {
    if (
      !isDrawingRef.current ||
      !currentStrokeRef.current
    ) {
      return;
    }

    currentStrokeRef.current.points.push(getPoint(event));

    redraw();
  };

  // ==========================================
  // FINISH DRAWING
  // ==========================================

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;

    isDrawingRef.current = false;

    if (currentStrokeRef.current) {
      strokesRef.current = [
        ...strokesRef.current,
        currentStrokeRef.current,
      ];

      currentStrokeRef.current = null;
    }

    redraw();

    onChange(JSON.stringify(strokesRef.current));
  };

  // ==========================================
  // UNDO
  // ==========================================

  const undo = () => {
    strokesRef.current = strokesRef.current.slice(0, -1);

    redraw();

    onChange(JSON.stringify(strokesRef.current));
  };

  // ==========================================
  // CLEAR
  // ==========================================

  const clear = () => {
    strokesRef.current = [];
    currentStrokeRef.current = null;
    isDrawingRef.current = false;

    redraw();

    onChange("[]");
  };

  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      {/* TOOLBAR */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        {/* Pencil */}
        <button
          type="button"
          onClick={() => setIsEraser(false)}
          aria-label="Pencil"
          aria-pressed={!isEraser}
          className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
            !isEraser
              ? "bg-blue-50 text-blue-600"
              : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          <Pencil className="h-4 w-4" />
        </button>

        {/* Eraser */}
        <button
          type="button"
          onClick={() => setIsEraser(true)}
          aria-label="Eraser"
          aria-pressed={isEraser}
          className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
            isEraser
              ? "bg-blue-50 text-blue-600"
              : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          <Eraser className="h-4 w-4" />
        </button>

        <span className="h-6 w-px bg-gray-200" />

        {/* Colors */}
        <div className="flex items-center gap-2">
          {COLORS.map((itemColor) => (
            <button
              key={itemColor}
              type="button"
              onClick={() => {
                setColor(itemColor);
                setIsEraser(false);
              }}
              aria-label={`Choose ${itemColor}`}
              aria-pressed={color === itemColor && !isEraser}
              className={`h-6 w-6 rounded-full border transition-transform hover:scale-110 ${
                color === itemColor && !isEraser
                  ? "ring-2 ring-blue-500 ring-offset-2"
                  : "border-gray-200"
              }`}
              style={{ backgroundColor: itemColor }}
            />
          ))}
        </div>

        <span className="h-6 w-px bg-gray-200" />

        {/* Brush Size */}
        <label className="flex items-center gap-2 text-xs text-gray-500">
          Size

          <input
            type="range"
            min={1}
            max={12}
            value={brushSize}
            onChange={(event) =>
              setBrushSize(Number(event.target.value))
            }
            className="w-20 accent-blue-600"
          />
        </label>

        <div className="ml-auto flex items-center gap-1">
          {/* Undo */}
          <button
            type="button"
            onClick={undo}
            disabled={strokesRef.current.length === 0}
            aria-label="Undo last stroke"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40"
          >
            <Undo2 className="h-4 w-4" />
          </button>

          {/* Clear */}
          <button
            type="button"
            onClick={clear}
            aria-label="Clear whiteboard"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* CANVAS */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          aria-label="Whiteboard drawing canvas"
          className="absolute inset-0 h-full w-full touch-none"
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          onLostPointerCapture={stopDrawing}
        />
      </div>
    </section>
  );
}