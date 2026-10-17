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
} from "lucide-react";

import "@excalidraw/excalidraw/index.css";
import "./whiteboard.css";

// ==================================================
// TYPES
// ==================================================

interface WhiteBoardProps {
  initialContent: string;
  onChange: (content: string) => void;
}

interface ExcalidrawScene {
  type: "excalidraw";
  version: number;
  source: string;
  elements: readonly unknown[];
  appState: {
    viewBackgroundColor: string;
    gridSize: number | null;
  };
  files: Record<string, unknown>;
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

// ==================================================
// TOOLBAR CONFIGURATION
// ==================================================

const TOOLBAR_TOOLS: ToolbarTool[] = [
  {
    id: "selection",
    label: "Select and Move",
    shortcut: "1",
    icon: MousePointer2,
    color: "#8B5CF6",
  },
  {
    id: "hand",
    label: "Move Individual Shapes",
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
    label: "Circle / Ellipse",
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
    label: "Freehand Draw",
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
    label: "Insert Image",
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
    label: "Delete Selected",
    shortcut: "Delete",
    icon: Trash2,
    color: "#DC2626",
  },
];

// ==================================================
// DEFAULT SCENE
// ==================================================

function getDefaultScene(): ExcalidrawInitialDataState {
  return {
    elements: [],
    appState: {
      viewBackgroundColor: "#ffffff",
    },
  };
}

// ==================================================
// PARSE SAVED SCENE
// ==================================================

function parseInitialContent(
  content: string
): ExcalidrawInitialDataState {
  if (!content || content === "[]") {
    return getDefaultScene();
  }

  try {
    const parsed: unknown = JSON.parse(content);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return getDefaultScene();
    }

    if (
      !("elements" in parsed) ||
      !Array.isArray(parsed.elements)
    ) {
      return getDefaultScene();
    }

    return parsed as ExcalidrawInitialDataState;
  } catch (error) {
    console.error(
      "Unable to parse saved Excalidraw scene:",
      error
    );

    return getDefaultScene();
  }
}

// ==================================================
// EXCALIDRAW EDITOR
// ==================================================

const ExcalidrawEditor = dynamic(
  async () => {
    const { Excalidraw } = await import(
      "@excalidraw/excalidraw"
    );

    function Editor({
      initialContent,
      onChange,
    }: WhiteBoardProps) {
      // ----------------------------------------------
      // INITIAL SCENE
      // ----------------------------------------------

      const initialData = useMemo(
        () => parseInitialContent(initialContent),
        [initialContent]
      );

      // ----------------------------------------------
      // EXCALIDRAW API
      // ----------------------------------------------

      /*
       * Store the API in a ref instead of React state.
       *
       * Excalidraw can invoke excalidrawAPI during its
       * initialization/update lifecycle. Updating state
       * synchronously from that callback can cause the
       * React render-phase update error.
       */

      const excalidrawAPIRef =
        useRef<ExcalidrawImperativeAPI | null>(null);

      const [isAPIReady, setIsAPIReady] =
        useState(false);

      const readyFrameRef = useRef<number | null>(null);

      const [activeTool, setActiveTool] =
        useState<WhiteboardTool>("selection");

      // ----------------------------------------------
      // CLEANUP
      // ----------------------------------------------

      useEffect(() => {
        return () => {
          if (readyFrameRef.current !== null) {
            window.cancelAnimationFrame(
              readyFrameRef.current
            );
          }
        };
      }, []);

      // ----------------------------------------------
      // INITIALIZE API SAFELY
      // ----------------------------------------------

      const handleExcalidrawAPI = useCallback(
        (api: ExcalidrawImperativeAPI) => {
          excalidrawAPIRef.current = api;

          /*
           * Defer the React state update until the next
           * animation frame, outside the API callback.
           */

          if (readyFrameRef.current !== null) {
            window.cancelAnimationFrame(
              readyFrameRef.current
            );
          }

          readyFrameRef.current =
            window.requestAnimationFrame(() => {
              setIsAPIReady(true);
              readyFrameRef.current = null;
            });
        },
        []
      );

      // ----------------------------------------------
      // ACTIVATE TOOL
      // ----------------------------------------------

      const handleToolChange = useCallback(
        (tool: WhiteboardTool) => {
          const api = excalidrawAPIRef.current;

          if (!api) {
            return;
          }

          /*
           * The custom Hand button intentionally activates
           * selection mode so individual shapes can be moved.
           *
           * The actual Excalidraw hand tool pans the canvas.
           */

          const actualTool =
            tool === "hand" ? "selection" : tool;

          try {
            api.setActiveTool({
              type: actualTool,
            });

            setActiveTool(tool);
          } catch (error) {
            console.error(
              `Unable to activate ${tool}:`,
              error
            );
          }
        },
        []
      );

      // ----------------------------------------------
      // DELETE SELECTED ELEMENTS
      // ----------------------------------------------

      const handleDeleteSelected = useCallback(() => {
        const api = excalidrawAPIRef.current;

        if (!api) {
          return;
        }

        try {
          const appState = api.getAppState();

          const selectedIds =
            appState.selectedElementIds;

          const hasSelection = Object.values(
            selectedIds
          ).some(Boolean);

          if (!hasSelection) {
            return;
          }

          const elements = api.getSceneElements();

          /*
           * Remove selected elements only.
           * Leave all unselected elements untouched.
           */

          const remainingElements = elements.filter(
            (element) => !selectedIds[element.id]
          );

          api.updateScene({
            elements: remainingElements,
          });

          // Return to selection mode.
          api.setActiveTool({
            type: "selection",
          });

          setActiveTool("selection");
        } catch (error) {
          console.error(
            "Unable to delete selected elements:",
            error
          );
        }
      }, []);

      // ----------------------------------------------
      // TOOLBAR ACTION HANDLER
      // ----------------------------------------------

      const handleToolbarAction = useCallback(
        (action: ToolbarAction) => {
          if (action === "delete") {
            handleDeleteSelected();
            return;
          }

          handleToolChange(action);
        },
        [
          handleDeleteSelected,
          handleToolChange,
        ]
      );

      // ----------------------------------------------
      // SCENE CHANGE / AUTOSAVE
      // ----------------------------------------------

      const handleChange = useCallback(
        (
          elements: readonly unknown[],
          appState: {
            viewBackgroundColor?: string;
            gridSize?: number | null;
          },
          files: Record<string, unknown>
        ) => {
          const scene: ExcalidrawScene = {
            type: "excalidraw",
            version: 2,
            source: "ai-agentic-whiteboard",
            elements,
            appState: {
              viewBackgroundColor:
                appState.viewBackgroundColor ??
                "#ffffff",

              gridSize:
                appState.gridSize ?? null,
            },
            files,
          };

          onChange(JSON.stringify(scene));
        },
        [onChange]
      );

      // ----------------------------------------------
      // KEYBOARD SHORTCUTS
      // ----------------------------------------------

      const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLDivElement>) => {
          if (
            event.ctrlKey ||
            event.metaKey ||
            event.altKey
          ) {
            return;
          }

          const target = event.target as HTMLElement;

          if (
            target.isContentEditable ||
            target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA"
          ) {
            return;
          }

          /*
           * Let Excalidraw handle Delete and Backspace.
           * It already supports deleting selected elements.
           */

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

          const selectedTool =
            shortcuts[event.key.toLowerCase()];

          if (selectedTool) {
            event.preventDefault();
            handleToolChange(selectedTool);
          }
        },
        [handleToolChange]
      );

      // ----------------------------------------------
      // RENDER
      // ----------------------------------------------

      return (
        <div
          className="whizboard-editor"
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <Excalidraw
            initialData={initialData}
            excalidrawAPI={handleExcalidrawAPI}
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

          {/* CUSTOM LEFT TOOLBAR */}

          <aside
            className="whizboard-toolbar"
            aria-label="Whiteboard tools"
          >
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
                    isDelete ? undefined : isActive
                  }
                  disabled={!isAPIReady}
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
                    size={21}
                    strokeWidth={2}
                  />
                </button>
              );
            })}
          </aside>
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

// ==================================================
// WHITEBOARD COMPONENT
// ==================================================

export default function WhiteBoard(
  props: WhiteBoardProps
) {
  return (
    <div className="whizboard-excalidraw">
      <ExcalidrawEditor {...props} />
    </div>
  );
}