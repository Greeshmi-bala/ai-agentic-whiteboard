"use client";

import dynamic from "next/dynamic";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  ExcalidrawInitialDataState,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";

import type {
  ComponentType,
  CSSProperties,
  KeyboardEvent,
} from "react";

import {
  MousePointer2,
  Hand,
  Square,
  Diamond,
  Circle,
  ArrowRight,
  Minus,
  Pencil,
  Type,
  Image as ImageIcon,
  Eraser,
  Trash2,
  Copy,
  BringToFront,
  SendToBack,
  ArrowUp,
  ArrowDown,
  Lock,
  Unlock,
  RotateCcw,
  Plus,
  Palette,
  Type as TypeIcon,
  Move,
  Maximize2,
  Layers,
  ChevronDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Check,
  X,
  Sparkles,
  Paintbrush,
  SlidersHorizontal,
  Settings2,
} from "lucide-react";

import "@excalidraw/excalidraw/index.css";
import "./whiteboard.css";
import AIFloatingSidebar from "./AIFloatingSidebar";

// ======================================================
// TYPES
// ======================================================

interface WhiteBoardProps {
  initialContent: string;
  onChange: (content: string) => void;
}

type WhiteboardTool =
  | "selection"
  | "hand"
  | "rectangle"
  | "diamond"
  | "ellipse"
  | "arrow"
  | "line"
  | "freedraw"
  | "text"
  | "image"
  | "eraser";

type ToolbarAction = WhiteboardTool | "delete";

type PropertyTab =
  | "style"
  | "text"
  | "layout"
  | "arrange";

type ElementLike = Record<string, any> & {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

interface ToolbarTool {
  id: ToolbarAction;
  label: string;
  shortcut?: string;
  icon: ComponentType<{
    size?: number;
    strokeWidth?: number;
  }>;
  color: string;
}

// ======================================================
// DRAWING TOOLBAR
// ======================================================

const TOOLBAR_TOOLS: ToolbarTool[] = [
  {
    id: "selection",
    label: "Select",
    shortcut: "1",
    icon: MousePointer2,
    color: "#8B5CF6",
  },
  {
    id: "hand",
    label: "Move selected shapes",
    shortcut: "H",
    icon: Hand,
    color: "#06B6D4",
  },
  {
    id: "rectangle",
    label: "Rectangle",
    shortcut: "R",
    icon: Square,
    color: "#3B82F6",
  },
  {
    id: "diamond",
    label: "Diamond",
    shortcut: "D",
    icon: Diamond,
    color: "#10B981",
  },
  {
    id: "ellipse",
    label: "Circle / ellipse",
    shortcut: "O",
    icon: Circle,
    color: "#F59E0B",
  },
  {
    id: "arrow",
    label: "Arrow",
    shortcut: "A",
    icon: ArrowRight,
    color: "#8B5CF6",
  },
  {
    id: "line",
    label: "Line",
    shortcut: "L",
    icon: Minus,
    color: "#EC4899",
  },
  {
    id: "freedraw",
    label: "Freehand",
    shortcut: "P",
    icon: Pencil,
    color: "#F97316",
  },
  {
    id: "text",
    label: "Text",
    shortcut: "T",
    icon: Type,
    color: "#6366F1",
  },
  {
    id: "image",
    label: "Image",
    icon: ImageIcon,
    color: "#22C55E",
  },
  {
    id: "eraser",
    label: "Eraser",
    shortcut: "E",
    icon: Eraser,
    color: "#F43F5E",
  },
  {
    id: "delete",
    label: "Delete selected",
    shortcut: "Delete",
    icon: Trash2,
    color: "#DC2626",
  },
];

// ======================================================
// COLOR PALETTE
// ======================================================

const COLORS = [
  "#1E1E1E",
  "#64748B",
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#EAB308",
  "#22C55E",
  "#14B8A6",
  "#06B6D4",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#A855F7",
  "#EC4899",
  "#F43F5E",
  "#FFFFFF",
  "#F8FAFC",
  "#E2E8F0",
  "#FECACA",
  "#FED7AA",
  "#FEF08A",
  "#BBF7D0",
  "#A5F3FC",
  "#BFDBFE",
  "#C7D2FE",
  "#E9D5FF",
  "#FBCFE8",
  "#F1F5F9",
];

// ======================================================
// INITIAL SCENE
// ======================================================

function getDefaultScene(): ExcalidrawInitialDataState {
  return {
    elements: [],
    appState: {
      viewBackgroundColor: "#FFFFFF",
    },
  };
}

function parseInitialContent(
  content: string
): ExcalidrawInitialDataState {
  if (!content || content === "[]") {
    return getDefaultScene();
  }

  try {
    const parsed = JSON.parse(content);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      !Array.isArray(parsed.elements)
    ) {
      return getDefaultScene();
    }

    return parsed as ExcalidrawInitialDataState;
  } catch (error) {
    console.error(
      "Unable to parse saved whiteboard:",
      error
    );

    return getDefaultScene();
  }
}

// ======================================================
// UNIQUE ELEMENT ID
// ======================================================

function createElementId() {
  if (
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
  ) {
    return crypto.randomUUID();
  }

  return `element-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

// ======================================================
// COLOR UTILITIES
// ======================================================

function normalizeColor(
  color: string | undefined,
  fallback = "#1E1E1E"
) {
  if (
    color &&
    /^#[0-9a-fA-F]{6}$/.test(color)
  ) {
    return color;
  }

  return fallback;
}

// ======================================================
// MAIN EDITOR
// ======================================================

const ExcalidrawEditor = dynamic(
  async () => {
    const { Excalidraw } = await import(
      "@excalidraw/excalidraw"
    );

    function Editor({
      initialContent,
      onChange,
    }: WhiteBoardProps) {
      // ================================================
      // STATE
      // ================================================

      const initialData = useMemo(
        () => parseInitialContent(initialContent),
        [initialContent]
      );

      const apiRef =
        useRef<ExcalidrawImperativeAPI | null>(
          null
        );

      const readyFrameRef = useRef<number | null>(
        null
      );

      // Defer Excalidraw notifications until its update finishes.
      const pendingChangeRef = useRef<{
        content: string;
        selected: ElementLike[];
      } | null>(null);
      const changeScheduledRef = useRef(false);
      const mountedRef = useRef(true);
      const onChangeRef = useRef(onChange);
      onChangeRef.current = onChange;

      const [ready, setReady] = useState(false);

      const [activeTool, setActiveTool] =
        useState<WhiteboardTool>("selection");

      const [selectedElements, setSelectedElements] =
        useState<ElementLike[]>([]);

      const [activeTab, setActiveTab] =
        useState<PropertyTab>("style");

      const [labelText, setLabelText] =
        useState("");

      const [textDraft, setTextDraft] =
        useState("");

      const [showColorPicker, setShowColorPicker] =
        useState(false);

      const [showMoreColors, setShowMoreColors] =
        useState(false);

      const [showGeometry, setShowGeometry] =
        useState(true);

      const primary = selectedElements[0];

      const hasSelection =
        selectedElements.length > 0;

      const isText = primary?.type === "text";

      const isArrow = primary?.type === "arrow";

      const isLinear =
        primary?.type === "line" ||
        primary?.type === "arrow";

      const isRectangle =
        primary?.type === "rectangle";

      // ================================================
      // CLEANUP
      // ================================================

      useEffect(() => {
        mountedRef.current = true;
        return () => {
          mountedRef.current = false;
          if (readyFrameRef.current !== null) {
            cancelAnimationFrame(readyFrameRef.current);
          }
          // Preserve the latest canvas edit even if the editor unmounts
          // before its queued notification is delivered.
          const pending = pendingChangeRef.current;
          pendingChangeRef.current = null;
          if (pending) onChangeRef.current(pending.content);
        };
      }, []);

      // ================================================
      // SYNCHRONIZE TEXT DRAFT
      // ================================================

      useEffect(() => {
        setTextDraft(
          isText ? String(primary?.text ?? "") : ""
        );
      }, [
        primary?.id,
        primary?.text,
        isText,
      ]);

      // ================================================
      // EXCALIDRAW API
      // ================================================

      const handleAPI = useCallback(
        (api: ExcalidrawImperativeAPI) => {
          apiRef.current = api;

          if (readyFrameRef.current !== null) {
            cancelAnimationFrame(
              readyFrameRef.current
            );
          }

          readyFrameRef.current =
            requestAnimationFrame(() => {
              setReady(true);
              readyFrameRef.current = null;
            });
        },
        []
      );

      // ================================================
      // SELECTION
      // ================================================

      const refreshSelection = useCallback(() => {
        const api = apiRef.current;

        if (!api) return;

        const appState = api.getAppState() as any;

        const selectedIds =
          appState.selectedElementIds ?? {};

        const selected = api
          .getSceneElements()
          .filter(
            (element: any) =>
              selectedIds[element.id] &&
              !element.isDeleted
          ) as ElementLike[];

        setSelectedElements(selected);
      }, []);

      // ================================================
      // ACTIVATE DRAWING TOOL
      // ================================================

      const activateTool = useCallback(
        (tool: WhiteboardTool) => {
          const api = apiRef.current;

          if (!api) return;

          /*
           * Hand is deliberately mapped to selection.
           * This avoids changing the canvas-pan behavior.
           */
          const actualTool =
            tool === "hand" ? "selection" : tool;

          try {
            api.setActiveTool({
              type: actualTool as any,
            });

            setActiveTool(tool);
          } catch (error) {
            console.error(
              "Unable to activate drawing tool:",
              error
            );
          }
        },
        []
      );

      // ================================================
      // UPDATE SELECTED ELEMENTS
      // ================================================

      const updateSelected = useCallback(
        (patch: Record<string, unknown>) => {
          const api = apiRef.current;

          if (
            !api ||
            selectedElements.length === 0
          ) {
            return;
          }

          const selectedIds = new Set(
            selectedElements.map(
              (element) => element.id
            )
          );

          const elements = api
            .getSceneElements()
            .map((element: any) => {
              if (!selectedIds.has(element.id)) {
                return element;
              }

              return {
                ...element,
                ...patch,

                version:
                  (element.version ?? 0) + 1,

                versionNonce: Math.floor(
                  Math.random() * 2_147_483_647
                ),

                updated: Date.now(),
              };
            });

          api.updateScene({
            elements: elements as any,
          });

          requestAnimationFrame(refreshSelection);
        },
        [selectedElements, refreshSelection]
      );

      // ================================================
      // POSITION / SIZE / ROTATION
      // ================================================

      const updateGeometry = useCallback(
        (
          property:
            | "x"
            | "y"
            | "width"
            | "height"
            | "angle",
          value: number
        ) => {
          if (!Number.isFinite(value)) return;

          const nextValue =
            property === "width" ||
            property === "height"
              ? Math.max(1, value)
              : value;

          updateSelected({
            [property]: nextValue,
          });
        },
        [updateSelected]
      );

      // ================================================
      // DELETE
      // ================================================

      const deleteSelected = useCallback(() => {
        const api = apiRef.current;

        if (
          !api ||
          selectedElements.length === 0
        ) {
          return;
        }

        const selectedIds = new Set(
          selectedElements.map(
            (element) => element.id
          )
        );

        const elements = api
          .getSceneElements()
          .filter(
            (element: any) =>
              !selectedIds.has(element.id)
          );

        api.updateScene({
          elements: elements as any,

          appState: {
            selectedElementIds: {},
          } as any,
        });

        setSelectedElements([]);
      }, [selectedElements]);

      // ================================================
      // DUPLICATE
      // ================================================

      const duplicateSelected = useCallback(() => {
        const api = apiRef.current;

        if (
          !api ||
          selectedElements.length === 0
        ) {
          return;
        }

        const selectedIds = new Set(
          selectedElements.map(
            (element) => element.id
          )
        );

        const originals = api
          .getSceneElements()
          .filter(
            (element: any) =>
              selectedIds.has(element.id)
          ) as ElementLike[];

        const copies = originals.map(
          (element) => ({
            ...element,

            id: createElementId(),

            x: element.x + 24,
            y: element.y + 24,

            version: 1,

            versionNonce: Math.floor(
              Math.random() * 2_147_483_647
            ),

            updated: Date.now(),

            isDeleted: false,

            boundElements: null,

            containerId: null,

            startBinding: null,

            endBinding: null,

            groupIds: [],
          })
        );

        const elements = [
          ...api.getSceneElements(),
          ...copies,
        ];

        const selectedElementIds =
          Object.fromEntries(
            copies.map((element) => [
              element.id,
              true,
            ])
          );

        api.updateScene({
          elements: elements as any,

          appState: {
            selectedElementIds,
          } as any,
        });

        setSelectedElements(
          copies as ElementLike[]
        );
      }, [selectedElements]);

      // ================================================
      // LAYER ORDER
      // ================================================

      const reorderSelected = useCallback(
        (
          direction:
            | "front"
            | "back"
            | "forward"
            | "backward"
        ) => {
          const api = apiRef.current;

          if (
            !api ||
            selectedElements.length === 0
          ) {
            return;
          }

          const selectedIds = new Set(
            selectedElements.map(
              (element) => element.id
            )
          );

          const elements = [
            ...api.getSceneElements(),
          ] as ElementLike[];

          const selected = elements.filter(
            (element) =>
              selectedIds.has(element.id)
          );

          const remaining = elements.filter(
            (element) =>
              !selectedIds.has(element.id)
          );

          let next: ElementLike[];

          if (direction === "front") {
            next = [...remaining, ...selected];
          } else if (direction === "back") {
            next = [...selected, ...remaining];
          } else {
            next = [...elements];

            if (direction === "forward") {
              for (
                let index = next.length - 2;
                index >= 0;
                index--
              ) {
                if (
                  selectedIds.has(
                    next[index].id
                  ) &&
                  !selectedIds.has(
                    next[index + 1].id
                  )
                ) {
                  [
                    next[index],
                    next[index + 1],
                  ] = [
                    next[index + 1],
                    next[index],
                  ];
                }
              }
            } else {
              for (
                let index = 1;
                index < next.length;
                index++
              ) {
                if (
                  selectedIds.has(
                    next[index].id
                  ) &&
                  !selectedIds.has(
                    next[index - 1].id
                  )
                ) {
                  [
                    next[index],
                    next[index - 1],
                  ] = [
                    next[index - 1],
                    next[index],
                  ];
                }
              }
            }
          }

          api.updateScene({
            elements: next as any,
          });
        },
        [selectedElements]
      );

      // ================================================
      // ADD LABEL BELOW SHAPE
      // ================================================

      const addLabelBelow = useCallback(() => {
        const api = apiRef.current;

        if (!api || !primary) return;

        const text = labelText.trim();

        if (!text) return;

        const fontSize = 20;

        const width = Math.max(
          120,
          text.length * fontSize * 0.58
        );

        const label: Record<string, any> = {
          id: createElementId(),

          type: "text",

          x:
            primary.x +
            Math.max(
              0,
              (primary.width - width) / 2
            ),

          y: primary.y + primary.height + 16,

          width,

          height: fontSize * 1.5,

          angle: 0,

          strokeColor: "#1E1E1E",

          backgroundColor: "transparent",

          fillStyle: "solid",

          strokeWidth: 1,

          strokeStyle: "solid",

          roughness: 1,

          opacity: 100,

          groupIds: [],

          frameId: null,

          roundness: null,

          seed: Math.floor(
            Math.random() * 2_147_483_647
          ),

          version: 1,

          versionNonce: Math.floor(
            Math.random() * 2_147_483_647
          ),

          isDeleted: false,

          boundElements: null,

          updated: Date.now(),

          link: null,

          locked: false,

          text,

          originalText: text,

          fontSize,

          fontFamily: 2,

          textAlign: "center",

          verticalAlign: "top",

          baseline: fontSize,

          containerId: null,

          lineHeight: 1.25,
        };

        const elements = [
          ...api.getSceneElements(),
          label,
        ];

        api.updateScene({
          elements: elements as any,

          appState: {
            selectedElementIds: {
              [label.id]: true,
            },
          } as any,
        });

        setSelectedElements([
          label as ElementLike,
        ]);

        setActiveTab("text");

        setLabelText("");
      }, [primary, labelText]);

      // ================================================
      // CHANGE TEXT
      // ================================================

      const updateText = (value: string) => {
        setTextDraft(value);

        const fontSize = Number(
          primary?.fontSize ?? 20
        );

        const longestLine = value
          .split("\n")
          .reduce(
            (longest, line) =>
              Math.max(longest, line.length),
            0
          );

        updateSelected({
          text: value,

          originalText: value,

          width: Math.max(
            20,
            longestLine * fontSize * 0.62
          ),

          height: Math.max(
            24,
            value.split("\n").length *
              fontSize *
              1.35
          ),
        });
      };

      // ================================================
      // PERSISTENCE CALLBACK
      // ================================================

      const handleChange = useCallback(
        (
          elements: readonly any[],
          appState: any,
          files: Record<string, any>
        ) => {
          const scene = {
            type: "excalidraw",
            version: 2,
            source: "ai-agentic-whiteboard",
            elements,
            appState: {
              viewBackgroundColor:
                appState.viewBackgroundColor ?? "#FFFFFF",
              gridSize: appState.gridSize ?? null,
            },
            files,
          };

          const selectedIds = appState.selectedElementIds ?? {};
          pendingChangeRef.current = {
            content: JSON.stringify(scene),
            selected: elements.filter(
              (element: any) =>
                selectedIds[element.id] && !element.isDeleted
            ) as ElementLike[],
          };

          // Excalidraw may call onChange while React is updating its own
          // internal state. Never update this editor or its parent inline.
          // Coalesce changes in a microtask, keeping the latest scene.
          if (changeScheduledRef.current) return;
          changeScheduledRef.current = true;
          queueMicrotask(() => {
            changeScheduledRef.current = false;
            const pending = pendingChangeRef.current;
            pendingChangeRef.current = null;
            if (!pending || !mountedRef.current) return;
            setSelectedElements(pending.selected);
            onChangeRef.current(pending.content);
          });
        },
        []
      );

      // ================================================
      // ================================================
      // GEMINI AI -> EXCALIDRAW CANVAS
      // ================================================

      const handleAIGenerate = useCallback(
        async (tool: string, prompt: string) => {
          const api = apiRef.current;
          if (!api) throw new Error("The whiteboard is still loading. Please try again.");

          const response = await fetch("/api/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tool, prompt }),
          });
          const payload = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(payload?.error || "Gemini could not generate this diagram.");
          }

          const graph = payload?.diagram;
          if (!graph || !Array.isArray(graph.nodes) || graph.nodes.length === 0) {
            throw new Error("Gemini returned an empty diagram. Please try a more specific prompt.");
          }

          const nodes = graph.nodes.slice(0, 24).map((node: any, index: number) => ({
            id: String(node.id || `node-${index + 1}`),
            label: String(node.label || `Step ${index + 1}`).trim().slice(0, 180),
            shape: ["decision", "diamond"].includes(String(node.shape || "").toLowerCase())
              ? "diamond"
              : ["start", "end", "terminator", "ellipse"].includes(String(node.shape || "").toLowerCase())
                ? "ellipse"
                : "rectangle",
          }));

          const nodeIds = new Set(nodes.map((node: any) => node.id));
          const edges = (Array.isArray(graph.edges) ? graph.edges : [])
            .slice(0, 40)
            .filter((edge: any) => nodeIds.has(String(edge.from)) && nodeIds.has(String(edge.to)) && String(edge.from) !== String(edge.to))
            .map((edge: any) => ({
              from: String(edge.from),
              to: String(edge.to),
              label: edge.label ? String(edge.label).trim().slice(0, 50) : "",
            }));

          const incoming = new Map<string, string[]>(nodes.map((node: any) => [node.id, []]));
          const outgoing = new Map<string, string[]>(nodes.map((node: any) => [node.id, []]));
          edges.forEach((edge: any) => {
            incoming.get(edge.to)?.push(edge.from);
            outgoing.get(edge.from)?.push(edge.to);
          });

          const appState = api.getAppState() as any;
          const currentElements = api.getSceneElements() as any[];

          // ----------------------------------------------------
          // COLLISION-SAFE LAYERED LAYOUT
          // - One rank per workflow depth
          // - Variable node height for longer labels
          // - New diagrams are placed beside existing content,
          //   rather than being appended on top of it.
          // ----------------------------------------------------
          const nodeW = 252;
          const minNodeH = 94;
          const gapX = 144;
          const gapY = 128;
          const sideMargin = 180;

          const nodeHeights = new Map<string, number>();
          nodes.forEach((node: any) => {
            const label = String(node.label || "");
            const estimatedCharsPerLine = 23;
            const estimatedLines = Math.max(1, Math.ceil(label.length / estimatedCharsPerLine));
            nodeHeights.set(node.id, Math.max(minNodeH, Math.min(150, 36 + estimatedLines * 24)));
          });

          // Find the right-most existing element so a second generated
          // diagram doesn't land on top of a diagram already on the canvas.
          const visibleExisting = currentElements.filter((element: any) =>
            element && !element.isDeleted && Number.isFinite(element.x) &&
            Number.isFinite(element.y) && Number.isFinite(element.width) &&
            Number.isFinite(element.height)
          );
          const existingRight = visibleExisting.length
            ? Math.max(...visibleExisting.map((element: any) => element.x + Math.max(0, element.width)))
            : 0;
          const existingTop = visibleExisting.length
            ? Math.min(...visibleExisting.map((element: any) => element.y))
            : 0;

          const originX = visibleExisting.length
            ? existingRight + sideMargin
            : Math.max(120, -Number(appState?.scrollX ?? 0) + 120);
          const originY = visibleExisting.length
            ? Math.max(80, existingTop)
            : Math.max(100, -Number(appState?.scrollY ?? 0) + 100);

          // Kahn ranking. If the graph contains cycles, unresolved nodes are
          // placed in a final layer instead of producing runaway coordinates.
          const indegree = new Map<string, number>(
            nodes.map((node: any) => [node.id, incoming.get(node.id)?.length ?? 0])
          );
          const ranks = new Map<string, number>();
          const queue = nodes
            .filter((node: any) => (indegree.get(node.id) ?? 0) === 0)
            .map((node: any) => node.id);

          queue.forEach((id: string) => ranks.set(id, 0));
          let cursor = 0;
          while (cursor < queue.length) {
            const id = queue[cursor++];
            for (const nextId of outgoing.get(id) ?? []) {
              ranks.set(
                nextId,
                Math.max(ranks.get(nextId) ?? 0, (ranks.get(id) ?? 0) + 1)
              );
              indegree.set(nextId, (indegree.get(nextId) ?? 1) - 1);
              if (indegree.get(nextId) === 0) queue.push(nextId);
            }
          }

          const lastRank = Math.max(0, ...Array.from(ranks.values()));
          nodes.forEach((node: any) => {
            if (!ranks.has(node.id)) ranks.set(node.id, lastRank + 1);
          });

          const layers = new Map<number, any[]>();
          nodes.forEach((node: any) => {
            const rank = ranks.get(node.id) ?? 0;
            if (!layers.has(rank)) layers.set(rank, []);
            layers.get(rank)!.push(node);
          });

          // Stable order within each layer follows the incoming node order,
          // with enough room for every node and label.
          const positions = new Map<string, { x: number; y: number; w: number; h: number }>();
          const sortedLayers = Array.from(layers.entries()).sort((a, b) => a[0] - b[0]);
          const maxLayerWidth = Math.max(
            nodeW,
            ...sortedLayers.map(([, layer]) =>
              layer.length * nodeW + Math.max(0, layer.length - 1) * gapX
            )
          );

          let currentY = originY;
          sortedLayers.forEach(([rank, layer]) => {
            const layerWidth = layer.length * nodeW + Math.max(0, layer.length - 1) * gapX;
            const startX = originX + Math.max(0, (maxLayerWidth - layerWidth) / 2);
            const layerHeight = Math.max(...layer.map((node: any) => nodeHeights.get(node.id) ?? minNodeH));

            layer.forEach((node: any, index: number) => {
              const h = nodeHeights.get(node.id) ?? minNodeH;
              positions.set(node.id, {
                x: startX + index * (nodeW + gapX),
                y: currentY + (layerHeight - h) / 2,
                w: nodeW,
                h,
              });
            });
            currentY += layerHeight + gapY;
          });

          const seed = () => Math.floor(Math.random() * 2_147_483_647);
          const common = (
            id: string, type: string, x: number, y: number, width: number, height: number,
            strokeColor: string, backgroundColor: string,
          ) => ({
            id, type, x, y, width, height, angle: 0, strokeColor, backgroundColor,
            fillStyle: "solid", strokeWidth: 2, strokeStyle: "solid", roughness: 0,
            opacity: 100, groupIds: [], frameId: null, roundness: { type: 3 },
            seed: seed(), version: 1, versionNonce: seed(), isDeleted: false,
            boundElements: null, updated: Date.now(), link: null, locked: false,
          });

          const fills = ["#DBEAFE", "#D1FAE5", "#EDE9FE", "#FEF3C7", "#FCE7F3", "#CFFAFE"];
          const strokes = ["#2563EB", "#059669", "#7C3AED", "#D97706", "#DB2777", "#0891B2"];
          const generated: any[] = [];

          // Orthogonal connector routing. Connectors leave from the closest
          // side of the source and enter the closest side of the target.
          // Long/backward edges use an outside lane to reduce crossings.
          edges.forEach((edge: any, index: number) => {
            const from = positions.get(edge.from);
            const to = positions.get(edge.to);
            if (!from || !to) return;

            const sourceRank = ranks.get(edge.from) ?? 0;
            const targetRank = ranks.get(edge.to) ?? 0;
            const isForward = targetRank > sourceRank;
            const isSameLayer = sourceRank === targetRank;
            const startX = from.x + from.w / 2;
            const startY = isForward ? from.y + from.h : from.y + from.h / 2;
            const endX = to.x + to.w / 2;
            const endY = isForward ? to.y : to.y + to.h / 2;

            let absolutePoints: [number, number][];
            if (isSameLayer) {
              const laneX = Math.min(from.x, to.x) - 42 - (index % 4) * 14;
              absolutePoints = [
                [from.x, from.y + from.h / 2],
                [laneX, from.y + from.h / 2],
                [laneX, to.y + to.h / 2],
                [to.x, to.y + to.h / 2],
              ];
            } else if (isForward) {
              const middleY = (startY + endY) / 2;
              absolutePoints = Math.abs(startX - endX) < 8
                ? [[startX, startY], [endX, endY]]
                : [[startX, startY], [startX, middleY], [endX, middleY], [endX, endY]];
            } else {
              const laneX = Math.max(from.x + from.w, to.x + to.w) + 54 + (index % 4) * 16;
              absolutePoints = [
                [from.x + from.w, from.y + from.h / 2],
                [laneX, from.y + from.h / 2],
                [laneX, to.y + to.h / 2],
                [to.x + to.w, to.y + to.h / 2],
              ];
            }

            const compactPoints = absolutePoints.filter((point, pointIndex, all) =>
              pointIndex === 0 ||
              point[0] !== all[pointIndex - 1][0] ||
              point[1] !== all[pointIndex - 1][1]
            );
            const minX = Math.min(...compactPoints.map((point) => point[0]));
            const minY = Math.min(...compactPoints.map((point) => point[1]));
            const maxX = Math.max(...compactPoints.map((point) => point[0]));
            const maxY = Math.max(...compactPoints.map((point) => point[1]));
            const arrowId = `wb-ai-arrow-${Date.now()}-${index}-${seed()}`;

            generated.push({
              ...common(
                arrowId,
                "arrow",
                minX,
                minY,
                Math.max(1, maxX - minX),
                Math.max(1, maxY - minY),
                "#64748B",
                "transparent"
              ),
              points: compactPoints.map(([x, y]) => [x - minX, y - minY]),
              lastCommittedPoint: null,
              startBinding: null,
              endBinding: null,
              startArrowhead: null,
              endArrowhead: "arrow",
              elbowed: true,
              roundness: { type: 2 },
            });

            if (edge.label) {
              const labelId = `${arrowId}-label`;
              const midPoint = compactPoints[Math.floor(compactPoints.length / 2)];
              generated.push({
                ...common(
                  labelId,
                  "text",
                  midPoint[0] - 42,
                  midPoint[1] - 20,
                  84,
                  28,
                  "#475569",
                  "#FFFFFF"
                ),
                backgroundColor: "#FFFFFF",
                roundness: null,
                text: edge.label,
                originalText: edge.label,
                fontSize: 13,
                fontFamily: 2,
                textAlign: "center",
                verticalAlign: "middle",
                baseline: 13,
                containerId: null,
                lineHeight: 1.25,
              });
            }
          });

          nodes.forEach((node: any, index: number) => {
            const position = positions.get(node.id)!;
            const colorIndex = index % fills.length;
            const shapeId = `wb-ai-${Date.now()}-${index}-${seed()}`;
            const textId = `${shapeId}-label`;
            generated.push({
              ...common(shapeId, node.shape, position.x, position.y, position.w, position.h, strokes[colorIndex], fills[colorIndex]),
              roundness: node.shape === "rectangle" ? { type: 3 } : null,
              boundElements: [{ id: textId, type: "text" }],
            });
            const labelText = node.label;
            const labelLines = labelText.split("\n").length;
            const fontSize = labelText.length > 52 ? 15 : labelText.length > 32 ? 16 : 18;
            const textHeight = Math.min(position.h - 14, Math.max(30, labelLines * (fontSize + 5)));
            generated.push({
              ...common(textId, "text", position.x + 14, position.y + (position.h - textHeight) / 2, position.w - 28, textHeight, strokes[colorIndex], "transparent"),
              backgroundColor: "transparent", fillStyle: "solid", strokeWidth: 1,
              roughness: 0, roundness: null,
              text: labelText, originalText: labelText,
              fontSize, fontFamily: 2, textAlign: "center", verticalAlign: "middle",
              baseline: fontSize, containerId: shapeId, lineHeight: 1.25,
            });
          });

          const allPositions = Array.from(positions.values());
          const minDiagramX = Math.min(...allPositions.map((p) => p.x));
          const maxDiagramX = Math.max(...allPositions.map((p) => p.x + p.w));
          if (graph.title) {
            const title = String(graph.title).trim().slice(0, 120);
            const titleId = `wb-ai-title-${Date.now()}-${seed()}`;
            generated.push({
              ...common(titleId, "text", minDiagramX, Math.max(24, originY - 58), Math.max(nodeW, maxDiagramX - minDiagramX), 40, "#1E293B", "transparent"),
              backgroundColor: "transparent", roundness: null,
              text: title, originalText: title, fontSize: 26, fontFamily: 2,
              textAlign: "center", verticalAlign: "middle", baseline: 26,
              containerId: null, lineHeight: 1.25,
            });
          }

          api.updateScene({
            elements: [...currentElements, ...generated] as any,
            appState: { selectedElementIds: {} } as any,
          });
          setSelectedElements([]);

          // Keep the newly generated diagram in view where supported by Excalidraw.
          try {
            // Frame the complete generated diagram, including title and arrows,
            // but exclude individual text labels that are already inside nodes.
            const frameElements = generated.filter((element) =>
              element.type !== "text" || String(element.id).includes("wb-ai-title-") || !String(element.id).includes("-label")
            );
            if (frameElements.length && typeof (api as any).scrollToContent === "function") {
              requestAnimationFrame(() => {
                (api as any).scrollToContent(frameElements, { fitToContent: true, animate: true });
              });
            }
          } catch (error) {
            console.debug("Unable to auto-frame generated diagram:", error);
          }
        },
        []
      );

            // ================================================
      // KEYBOARD SHORTCUTS
      // ================================================

      const handleKeyDown = useCallback(
        (
          event: KeyboardEvent<HTMLDivElement>
        ) => {
          if (
            event.ctrlKey ||
            event.metaKey ||
            event.altKey
          ) {
            return;
          }

          const target =
            event.target as HTMLElement;

          if (
            target.isContentEditable ||
            [
              "INPUT",
              "TEXTAREA",
              "SELECT",
            ].includes(target.tagName)
          ) {
            return;
          }

          const shortcuts: Record<
            string,
            WhiteboardTool
          > = {
            "1": "selection",
            h: "hand",
            r: "rectangle",
            d: "diamond",
            o: "ellipse",
            a: "arrow",
            l: "line",
            p: "freedraw",
            t: "text",
            e: "eraser",
          };

          const tool =
            shortcuts[event.key.toLowerCase()];

          if (tool) {
            event.preventDefault();
            activateTool(tool);
          }
        },
        [activateTool]
      );

      // ================================================
      // TOOLBAR BUTTON ACTION
      // ================================================

      const handleToolbarAction = (
        action: ToolbarAction
      ) => {
        if (action === "delete") {
          deleteSelected();
          return;
        }

        activateTool(action);
      };

      // ================================================
      // COLOR CONTROL
      // ================================================

      const fillColor = normalizeColor(
        primary?.backgroundColor,
        "#FFFFFF"
      );

      const strokeColor = normalizeColor(
        primary?.strokeColor,
        "#1E1E1E"
      );

      // ================================================
      // RENDER
      // ================================================

      return (
        <div
          className="whizboard-editor"
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <Excalidraw
            initialData={initialData}
            excalidrawAPI={handleAPI}
            onChange={handleChange}
            UIOptions={{
              canvasActions: {
                loadScene: true,

                saveToActiveFile: false,

                toggleTheme: false,

                export: {
                  saveFileToDisk: true,
                },
              },
            }}
          />

          {/* ==========================================
              LEFT DRAWING TOOLBAR
          ========================================== */}

          <aside
            className="whizboard-toolbar"
            aria-label="Whiteboard tools"
          >
            <div className="whizboard-toolbar-brand">
              <Sparkles size={19} />
            </div>

            <div className="whizboard-toolbar-divider" />

            {TOOLBAR_TOOLS.map((tool) => {
              const Icon = tool.icon;

              const isDelete =
                tool.id === "delete";

              const isActive =
                !isDelete &&
                activeTool === tool.id;

              return (
                <button
                  key={tool.id}
                  type="button"
                  title={
                    tool.shortcut
                      ? `${tool.label} (${tool.shortcut})`
                      : tool.label
                  }
                  aria-label={tool.label}
                  aria-pressed={
                    isDelete
                      ? undefined
                      : isActive
                  }
                  disabled={!ready}
                  onClick={() =>
                    handleToolbarAction(tool.id)
                  }
                  className={[
                    "whizboard-tool-button",

                    isActive
                      ? "whizboard-tool-active"
                      : "",

                    isDelete
                      ? "whizboard-delete-button"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={
                    {
                      "--tool-color": tool.color,
                    } as CSSProperties
                  }
                >
                  <Icon
                    size={20}
                    strokeWidth={2}
                  />
                </button>
              );
            })}
          </aside>

          {/* ==========================================
              PROPERTY PANEL
          ========================================== */}

          {hasSelection && (
            <aside
              className="whizboard-properties"
              aria-label="Selected element properties"
            >
              {/* PANEL HEADER */}

              <div className="whizboard-properties-header">
                <div className="whizboard-properties-heading">
                  <div className="whizboard-properties-icon">
                    <Palette size={18} />
                  </div>

                  <div className="whizboard-properties-title">
                    <h3>
                      {selectedElements.length > 1
                        ? `${selectedElements.length} selected`
                        : `${primary.type[0].toUpperCase()}${primary.type.slice(1)}`}
                    </h3>

                    <p>
                      Customize your selection
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="whizboard-close-button"
                  aria-label="Close properties"
                  title="Close properties"
                  onClick={() => {
                    apiRef.current?.updateScene({
                      appState: {
                        selectedElementIds: {},
                      } as any,
                    });

                    setSelectedElements([]);
                  }}
                >
                  <X size={17} />
                </button>
              </div>

              {/* QUICK COLOR STRIP */}

              <div className="whizboard-quick-colors">
                <span className="whizboard-quick-label">
                  Quick colors
                </span>

                <div className="whizboard-quick-swatches">
                  {COLORS.slice(0, 14).map(
                    (color) => (
                      <button
                        key={color}
                        type="button"
                        title={color}
                        aria-label={`Set fill color ${color}`}
                        className={[
                          "whizboard-quick-swatch",

                          fillColor.toLowerCase() ===
                          color.toLowerCase()
                            ? "selected"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        style={{
                          backgroundColor: color,
                        }}
                        onClick={() =>
                          updateSelected({
                            backgroundColor: color,
                          })
                        }
                        disabled={isText || isLinear}
                      />
                    )
                  )}
                </div>
              </div>

              {/* PROPERTY TABS */}

              <nav
                className="whizboard-property-tabs"
                aria-label="Property categories"
              >
                <button
                  type="button"
                  className={
                    activeTab === "style"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setActiveTab("style")
                  }
                  aria-pressed={
                    activeTab === "style"
                  }
                >
                  <Paintbrush size={15} />
                  Style
                </button>

                <button
                  type="button"
                  className={
                    activeTab === "text"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setActiveTab("text")
                  }
                  aria-pressed={
                    activeTab === "text"
                  }
                >
                  <TypeIcon size={15} />
                  Text
                </button>

                <button
                  type="button"
                  className={
                    activeTab === "layout"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setActiveTab("layout")
                  }
                  aria-pressed={
                    activeTab === "layout"
                  }
                >
                  <Move size={15} />
                  Layout
                </button>

                <button
                  type="button"
                  className={
                    activeTab === "arrange"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setActiveTab("arrange")
                  }
                  aria-pressed={
                    activeTab === "arrange"
                  }
                >
                  <Layers size={15} />
                  Arrange
                </button>
              </nav>

              {/* PROPERTY BODY */}

              <div className="whizboard-property-content">

                {/* ====================================
                    STYLE TAB
                ==================================== */}

                {activeTab === "style" && (
                  <>
                    {/* FILL */}

                    <section className="whizboard-section">
                      <div className="whizboard-section-heading">
                        <div className="whizboard-section-title">
                          <span className="whizboard-section-icon fill-icon">
                            <Palette size={15} />
                          </span>

                          <div>
                            <h4>Fill</h4>

                            <p>
                              Background color
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="whizboard-text-button"
                          onClick={() =>
                            updateSelected({
                              backgroundColor:
                                "transparent",
                            })
                          }
                          disabled={isText || isLinear}
                        >
                          No fill
                        </button>
                      </div>

                      <div className="whizboard-color-row">
                        <label className="whizboard-color-picker">
                          <input
                            type="color"
                            aria-label="Custom fill color"
                            value={fillColor}
                            onChange={(event) =>
                              updateSelected({
                                backgroundColor:
                                  event.target.value,
                              })
                            }
                            disabled={isText || isLinear}
                          />

                          <span
                            style={{
                              backgroundColor:
                                fillColor,
                            }}
                          />
                        </label>

                        <div className="whizboard-color-value">
                          <span>HEX</span>

                          <code>{fillColor}</code>
                        </div>

                        <button
                          type="button"
                          className="whizboard-icon-action"
                          title="Choose a custom color"
                          onClick={() =>
                            setShowColorPicker(
                              (value) => !value
                            )
                          }
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      {showColorPicker && (
                        <div className="whizboard-custom-color">
                          <label>
                            Custom color

                            <input
                              type="color"
                              value={fillColor}
                              onChange={(event) =>
                                updateSelected({
                                  backgroundColor:
                                    event.target.value,
                                })
                              }
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() =>
                              setShowColorPicker(false)
                            }
                          >
                            <Check size={14} />
                            Done
                          </button>
                        </div>
                      )}

                      <div className="whizboard-color-grid">
                        {(showMoreColors
                          ? COLORS
                          : COLORS.slice(0, 21)
                        ).map((color) => (
                          <button
                            key={color}
                            type="button"
                            title={color}
                            aria-label={`Fill ${color}`}
                            className={[
                              "whizboard-color-swatch",

                              fillColor.toLowerCase() ===
                              color.toLowerCase()
                                ? "selected"
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            style={{
                              backgroundColor: color,
                            }}
                            onClick={() =>
                              updateSelected({
                                backgroundColor:
                                  color,
                              })
                            }
                            disabled={
                              isText || isLinear
                            }
                          >
                            {fillColor.toLowerCase() ===
                              color.toLowerCase() && (
                              <Check
                                size={13}
                                className={
                                  color === "#FFFFFF" ||
                                  color === "#F8FAFC" ||
                                  color === "#F1F5F9"
                                    ? "dark-check"
                                    : ""
                                }
                              />
                            )}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        className="whizboard-show-colors"
                        onClick={() =>
                          setShowMoreColors(
                            (value) => !value
                          )
                        }
                      >
                        {showMoreColors
                          ? "Show fewer colors"
                          : "Show all colors"}

                        <ChevronDown
                          size={14}
                          className={
                            showMoreColors
                              ? "rotated"
                              : ""
                          }
                        />
                      </button>
                    </section>

                    {/* BORDER */}

                    <section className="whizboard-section">
                      <div className="whizboard-section-heading">
                        <div className="whizboard-section-title">
                          <span className="whizboard-section-icon border-icon">
                            <Square size={15} />
                          </span>

                          <div>
                            <h4>Border</h4>

                            <p>
                              Outline and stroke
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="whizboard-color-row">
                        <label className="whizboard-color-picker">
                          <input
                            type="color"
                            aria-label="Border color"
                            value={strokeColor}
                            onChange={(event) =>
                              updateSelected({
                                strokeColor:
                                  event.target.value,
                              })
                            }
                          />

                          <span
                            style={{
                              backgroundColor:
                                strokeColor,
                            }}
                          />
                        </label>

                        <div className="whizboard-color-value">
                          <span>HEX</span>

                          <code>{strokeColor}</code>
                        </div>
                      </div>

                      <div className="whizboard-field-grid">
                        <label className="whizboard-field">
                          <span>Width</span>

                          <select
                            value={
                              primary.strokeWidth ?? 2
                            }
                            onChange={(event) =>
                              updateSelected({
                                strokeWidth: Number(
                                  event.target.value
                                ),
                              })
                            }
                          >
                            <option value={1}>
                              1 px
                            </option>

                            <option value={2}>
                              2 px
                            </option>

                            <option value={4}>
                              4 px
                            </option>

                            <option value={6}>
                              6 px
                            </option>
                          </select>
                        </label>

                        <label className="whizboard-field">
                          <span>Style</span>

                          <select
                            value={
                              primary.strokeStyle ??
                              "solid"
                            }
                            onChange={(event) =>
                              updateSelected({
                                strokeStyle:
                                  event.target.value,
                              })
                            }
                          >
                            <option value="solid">
                              Solid
                            </option>

                            <option value="dashed">
                              Dashed
                            </option>

                            <option value="dotted">
                              Dotted
                            </option>
                          </select>
                        </label>
                      </div>
                    </section>

                    {/* OPACITY */}

                    <section className="whizboard-section">
                      <div className="whizboard-section-heading">
                        <div className="whizboard-section-title">
                          <span className="whizboard-section-icon opacity-icon">
                            <SlidersHorizontal size={15} />
                          </span>

                          <div>
                            <h4>Opacity</h4>

                            <p>
                              Transparency level
                            </p>
                          </div>
                        </div>

                        <span className="whizboard-value-badge">
                          {primary.opacity ?? 100}%
                        </span>
                      </div>

                      <input
                        className="whizboard-range"
                        type="range"
                        min="0"
                        max="100"
                        value={primary.opacity ?? 100}
                        onChange={(event) =>
                          updateSelected({
                            opacity: Number(
                              event.target.value
                            ),
                          })
                        }
                        aria-label="Element opacity"
                        style={{
                          accentColor: "#7C3AED",
                        }}
                      />
                    </section>

                    {/* FILL PATTERN */}

                    <section className="whizboard-section">
                      <div className="whizboard-section-heading">
                        <div className="whizboard-section-title">
                          <span className="whizboard-section-icon pattern-icon">
                            <Sparkles size={15} />
                          </span>

                          <div>
                            <h4>Fill pattern</h4>

                            <p>
                              Choose a fill style
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="whizboard-pattern-grid">
                        {[
                          {
                            id: "solid",
                            label: "Solid",
                          },
                          {
                            id: "hachure",
                            label: "Hachure",
                          },
                          {
                            id: "cross-hatch",
                            label: "Cross hatch",
                          },
                          {
                            id: "zigzag",
                            label: "Zigzag",
                          },
                        ].map((pattern) => (
                          <button
                            key={pattern.id}
                            type="button"
                            className={[
                              "whizboard-pattern-option",

                              (primary.fillStyle ??
                                "solid") === pattern.id
                                ? "selected"
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onClick={() =>
                              updateSelected({
                                fillStyle:
                                  pattern.id,
                              })
                            }
                            disabled={
                              isText || isLinear
                            }
                          >
                            <span
                              className={`whizboard-pattern-preview pattern-${pattern.id}`}
                            />

                            <span>
                              {pattern.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </section>

                    {/* SHAPE STYLE */}

                    {(isRectangle ||
                      primary.type === "ellipse" ||
                      primary.type === "diamond") && (
                      <section className="whizboard-section">
                        <div className="whizboard-section-heading">
                          <div className="whizboard-section-title">
                            <span className="whizboard-section-icon shape-icon">
                              <Settings2 size={15} />
                            </span>

                            <div>
                              <h4>Shape style</h4>

                              <p>
                                Fine-tune appearance
                              </p>
                            </div>
                          </div>
                        </div>

                        {isRectangle && (
                          <button
                            type="button"
                            className={[
                              "whizboard-toggle-row",

                              primary.roundness
                                ? "enabled"
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onClick={() =>
                              updateSelected({
                                roundness:
                                  primary.roundness
                                    ? null
                                    : { type: 3 },
                              })
                            }
                          >
                            <span>
                              <span className="whizboard-toggle-title">
                                Rounded corners
                              </span>

                              <span className="whizboard-toggle-description">
                                Soften rectangle edges
                              </span>
                            </span>

                            <span className="whizboard-toggle">
                              <span />
                            </span>
                          </button>
                        )}

                        <div className="whizboard-section-heading whizboard-slider-heading">
                          <span className="whizboard-slider-label">
                            Sketch roughness
                          </span>

                          <span className="whizboard-value-badge">
                            {primary.roughness ?? 1}
                          </span>
                        </div>

                        <input
                          className="whizboard-range"
                          type="range"
                          min="0"
                          max="2"
                          step="1"
                          value={primary.roughness ?? 1}
                          onChange={(event) =>
                            updateSelected({
                              roughness: Number(
                                event.target.value
                              ),
                            })
                          }
                          aria-label="Sketch roughness"
                          style={{
                            accentColor: "#F97316",
                          }}
                        />
                      </section>
                    )}
                  </>
                )}

                {/* ====================================
                    TEXT TAB
                ==================================== */}

                {activeTab === "text" && (
                  <>
                    {isText ? (
                      <>
                        <section className="whizboard-section">
                          <div className="whizboard-section-heading">
                            <div className="whizboard-section-title">
                              <span className="whizboard-section-icon text-icon">
                                <Type size={15} />
                              </span>

                              <div>
                                <h4>Text content</h4>

                                <p>
                                  Edit your text
                                </p>
                              </div>
                            </div>
                          </div>

                          <label className="whizboard-field">
                            <span>Content</span>

                            <textarea
                              rows={4}
                              value={textDraft}
                              onChange={(event) =>
                                updateText(
                                  event.target.value
                                )
                              }
                              placeholder="Write something..."
                            />
                          </label>

                          <div className="whizboard-field-grid">
                            <label className="whizboard-field">
                              <span>Font size</span>

                              <input
                                type="number"
                                min="8"
                                max="120"
                                value={
                                  primary.fontSize ?? 20
                                }
                                onChange={(event) =>
                                  updateSelected({
                                    fontSize: Math.max(
                                      8,
                                      Math.min(
                                        120,
                                        Number(
                                          event.target
                                            .value
                                        ) || 8
                                      ),
                                    ),
                                  })
                                }
                              />
                            </label>

                            <label className="whizboard-field">
                              <span>Font family</span>

                              <select
                                value={
                                  primary.fontFamily ?? 2
                                }
                                onChange={(event) =>
                                  updateSelected({
                                    fontFamily: Number(
                                      event.target.value
                                    ),
                                  })
                                }
                              >
                                <option value={1}>
                                  Virgil
                                </option>

                                <option value={2}>
                                  Helvetica
                                </option>

                                <option value={3}>
                                  Cascadia
                                </option>
                              </select>
                            </label>
                          </div>
                        </section>

                        <section className="whizboard-section">
                          <div className="whizboard-section-heading">
                            <div className="whizboard-section-title">
                              <span className="whizboard-section-icon text-icon">
                                <AlignCenter size={15} />
                              </span>

                              <div>
                                <h4>Alignment</h4>

                                <p>
                                  Text alignment
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="whizboard-alignment">
                            <button
                              type="button"
                              title="Align left"
                              aria-pressed={
                                primary.textAlign ===
                                "left"
                              }
                              onClick={() =>
                                updateSelected({
                                  textAlign: "left",
                                })
                              }
                            >
                              <AlignLeft size={18} />
                            </button>

                            <button
                              type="button"
                              title="Align center"
                              aria-pressed={
                                primary.textAlign ===
                                "center"
                              }
                              onClick={() =>
                                updateSelected({
                                  textAlign: "center",
                                })
                              }
                            >
                              <AlignCenter size={18} />
                            </button>

                            <button
                              type="button"
                              title="Align right"
                              aria-pressed={
                                primary.textAlign ===
                                "right"
                              }
                              onClick={() =>
                                updateSelected({
                                  textAlign: "right",
                                })
                              }
                            >
                              <AlignRight size={18} />
                            </button>
                          </div>
                        </section>

                        <section className="whizboard-section">
                          <div className="whizboard-section-heading">
                            <div className="whizboard-section-title">
                              <span className="whizboard-section-icon border-icon">
                                <Palette size={15} />
                              </span>

                              <div>
                                <h4>Text color</h4>

                                <p>
                                  Choose a text color
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="whizboard-color-grid">
                            {COLORS.map((color) => (
                              <button
                                key={color}
                                type="button"
                                title={color}
                                aria-label={`Set text color ${color}`}
                                className={[
                                  "whizboard-color-swatch",

                                  strokeColor.toLowerCase() ===
                                  color.toLowerCase()
                                    ? "selected"
                                    : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                style={{
                                  backgroundColor: color,
                                }}
                                onClick={() =>
                                  updateSelected({
                                    strokeColor: color,
                                  })
                                }
                              />
                            ))}
                          </div>
                        </section>
                      </>
                    ) : (
                      <section className="whizboard-empty-state">
                        <span>
                          <Type size={24} />
                        </span>

                        <h4>Select a text element</h4>

                        <p>
                          Choose a text element on the
                          canvas to edit its content,
                          font, size, alignment, and
                          color.
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            activateTool("text")
                          }
                        >
                          <Plus size={15} />
                          Create text
                        </button>
                      </section>
                    )}
                  </>
                )}

                {/* ====================================
                    LAYOUT TAB
                ==================================== */}

                {activeTab === "layout" && (
                  <>
                    <section className="whizboard-section">
                      <div className="whizboard-section-heading">
                        <div className="whizboard-section-title">
                          <span className="whizboard-section-icon layout-icon">
                            <Move size={15} />
                          </span>

                          <div>
                            <h4>Position</h4>

                            <p>
                              Precise canvas placement
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="whizboard-field-grid">
                        <label className="whizboard-field">
                          <span>X position</span>

                          <input
                            type="number"
                            value={Math.round(primary.x)}
                            onChange={(event) =>
                              updateGeometry(
                                "x",
                                Number(
                                  event.target.value
                                )
                              )
                            }
                          />
                        </label>

                        <label className="whizboard-field">
                          <span>Y position</span>

                          <input
                            type="number"
                            value={Math.round(primary.y)}
                            onChange={(event) =>
                              updateGeometry(
                                "y",
                                Number(
                                  event.target.value
                                )
                              )
                            }
                          />
                        </label>
                      </div>
                    </section>

                    <section className="whizboard-section">
                      <div className="whizboard-section-heading">
                        <div className="whizboard-section-title">
                          <span className="whizboard-section-icon layout-icon">
                            <Maximize2 size={15} />
                          </span>

                          <div>
                            <h4>Dimensions</h4>

                            <p>
                              Width and height
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="whizboard-field-grid">
                        <label className="whizboard-field">
                          <span>Width</span>

                          <input
                            type="number"
                            min="1"
                            value={Math.round(
                              primary.width
                            )}
                            onChange={(event) =>
                              updateGeometry(
                                "width",
                                Number(
                                  event.target.value
                                )
                              )
                            }
                          />
                        </label>

                        <label className="whizboard-field">
                          <span>Height</span>

                          <input
                            type="number"
                            min="1"
                            value={Math.round(
                              primary.height
                            )}
                            onChange={(event) =>
                              updateGeometry(
                                "height",
                                Number(
                                  event.target.value
                                )
                              )
                            }
                          />
                        </label>
                      </div>
                    </section>

                    <section className="whizboard-section">
                      <div className="whizboard-section-heading">
                        <div className="whizboard-section-title">
                          <span className="whizboard-section-icon layout-icon">
                            <RotateCcw size={15} />
                          </span>

                          <div>
                            <h4>Rotation</h4>

                            <p>
                              Rotate the selected element
                            </p>
                          </div>
                        </div>
                      </div>

                      <label className="whizboard-field">
                        <span>Angle in degrees</span>

                        <input
                          type="number"
                          value={Math.round(
                            ((primary.angle ?? 0) *
                              180) /
                              Math.PI
                          )}
                          onChange={(event) =>
                            updateGeometry(
                              "angle",
                              (Number(
                                event.target.value
                              ) *
                                Math.PI) /
                                180
                            )
                          }
                        />
                      </label>

                      <button
                        type="button"
                        className="whizboard-secondary-button"
                        onClick={() =>
                          updateSelected({
                            angle: 0,
                          })
                        }
                      >
                        <RotateCcw size={15} />
                        Reset rotation
                      </button>
                    </section>
                  </>
                )}

                {/* ====================================
                    ARRANGE TAB
                ==================================== */}

                {activeTab === "arrange" && (
                  <>
                    <section className="whizboard-section">
                      <div className="whizboard-section-heading">
                        <div className="whizboard-section-title">
                          <span className="whizboard-section-icon arrange-icon">
                            <Layers size={15} />
                          </span>

                          <div>
                            <h4>Layer order</h4>

                            <p>
                              Control overlapping elements
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="whizboard-arrange-grid">
                        <button
                          type="button"
                          onClick={() =>
                            reorderSelected("front")
                          }
                        >
                          <BringToFront size={18} />

                          <span>
                            <strong>
                              Bring to front
                            </strong>

                            <small>
                              Top layer
                            </small>
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            reorderSelected("back")
                          }
                        >
                          <SendToBack size={18} />

                          <span>
                            <strong>
                              Send to back
                            </strong>

                            <small>
                              Bottom layer
                            </small>
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            reorderSelected("forward")
                          }
                        >
                          <ArrowUp size={18} />

                          <span>
                            <strong>
                              Bring forward
                            </strong>

                            <small>
                              Move up one layer
                            </small>
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            reorderSelected("backward")
                          }
                        >
                          <ArrowDown size={18} />

                          <span>
                            <strong>
                              Send backward
                            </strong>

                            <small>
                              Move down one layer
                            </small>
                          </span>
                        </button>
                      </div>
                    </section>

                    <section className="whizboard-section">
                      <div className="whizboard-section-heading">
                        <div className="whizboard-section-title">
                          <span className="whizboard-section-icon shape-icon">
                            <Settings2 size={15} />
                          </span>

                          <div>
                            <h4>Element actions</h4>

                            <p>
                              Manage your selection
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="whizboard-arrange-grid">
                        <button
                          type="button"
                          onClick={duplicateSelected}
                        >
                          <Copy size={18} />

                          <span>
                            <strong>Duplicate</strong>

                            <small>
                              Create a copy
                            </small>
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateSelected({
                              locked: !primary.locked,
                            })
                          }
                        >
                          {primary.locked ? (
                            <Unlock size={18} />
                          ) : (
                            <Lock size={18} />
                          )}

                          <span>
                            <strong>
                              {primary.locked
                                ? "Unlock"
                                : "Lock"}
                            </strong>

                            <small>
                              Toggle lock property
                            </small>
                          </span>
                        </button>
                      </div>
                    </section>

                    {!isText && (
                      <section className="whizboard-section">
                        <div className="whizboard-section-heading">
                          <div className="whizboard-section-title">
                            <span className="whizboard-section-icon text-icon">
                              <Type size={15} />
                            </span>

                            <div>
                              <h4>Label</h4>

                              <p>
                                Add a caption below
                                the shape
                              </p>
                            </div>
                          </div>
                        </div>

                        <label className="whizboard-field">
                          <span>Label text</span>

                          <input
                            type="text"
                            value={labelText}
                            onChange={(event) =>
                              setLabelText(
                                event.target.value
                              )
                            }
                            placeholder="Enter a label..."
                          />
                        </label>

                        <button
                          type="button"
                          className="whizboard-primary-button"
                          disabled={!labelText.trim()}
                          onClick={addLabelBelow}
                        >
                          <Plus size={16} />
                          Add label below
                        </button>
                      </section>
                    )}

                    <section className="whizboard-section">
                      <button
                        type="button"
                        className="whizboard-danger-button"
                        onClick={deleteSelected}
                      >
                        <Trash2 size={16} />
                        Delete selected element
                      </button>
                    </section>
                  </>
                )}
              </div>

              {/* PANEL FOOTER */}

              <div className="whizboard-properties-footer">
                <span>
                  <span className="whizboard-status-dot" />
                  {selectedElements.length > 1
                    ? `${selectedElements.length} elements`
                    : "1 element selected"}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("style");
                  }}
                >
                  <Sparkles size={13} />
                  Properties
                </button>
              </div>
            </aside>
          )}

          {/* Gemini AI generates a structured diagram and adds it to the current Excalidraw scene. */}
          <AIFloatingSidebar onGenerate={handleAIGenerate} />
        </div>
      );
    }

    return Editor;
  },
  {
    ssr: false,

    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-white text-sm text-gray-500">
        Loading whiteboard...
      </div>
    ),
  }
);

// ======================================================
// EXPORTED COMPONENT
// ======================================================

export default function WhiteBoard(
  props: WhiteBoardProps
) {
  return (
    <div className="whizboard-excalidraw">
      <ExcalidrawEditor {...props} />
    </div>
  );
}