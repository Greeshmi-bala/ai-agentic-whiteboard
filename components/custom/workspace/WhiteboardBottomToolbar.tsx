"use client";

import { useMemo, useState } from "react";
import EmojiPicker, { type EmojiClickData, Theme } from "emoji-picker-react";
import {
  StickyNote,
  Smile,
  Shapes,
  Search,
  X,
  Sparkles,
  Check,
} from "lucide-react";

type PickerPanel = "notes" | "emoji" | "icons" | null;

interface WhiteboardBottomToolbarProps {
  onInsertNote: (color: string) => void;
  onInsertEmoji: (emoji: string) => void;
  onInsertIcon: (symbol: string, color: string) => void;
  disabled?: boolean;
}

const NOTE_COLORS = [
  { name: "Sunshine", color: "#FEF08A" },
  { name: "Peach", color: "#FED7AA" },
  { name: "Rose", color: "#FBCFE8" },
  { name: "Lavender", color: "#E9D5FF" },
  { name: "Sky", color: "#BFDBFE" },
  { name: "Mint", color: "#BBF7D0" },
  { name: "Aqua", color: "#A5F3FC" },
  { name: "White", color: "#FFFFFF" },
];

const ICON_GROUPS = [
  {
    title: "Decorative",
    items: ["✦", "✧", "★", "☆", "✷", "✹", "❋", "❈", "❖", "※", "〰", "〜", "⚡", "☼", "☾", "♧"],
  },
  {
    title: "Arrows & flow",
    items: ["→", "↗", "↘", "↙", "↖", "↔", "↕", "➜", "➤", "➝", "⤴", "⤵", "⇢", "⇄", "⟶", "⟷"],
  },
  {
    title: "Shapes & status",
    items: ["●", "○", "■", "□", "▲", "△", "◆", "◇", "⬟", "⬡", "✓", "✔", "✕", "＋", "−", "∞"],
  },
  {
    title: "Math & diagram",
    items: ["∑", "∏", "√", "≈", "≠", "≤", "≥", "÷", "×", "∴", "∵", "⊕", "⊗", "∩", "∪", "∠"],
  },
];

const ICON_LABELS: Record<string, string> = {
  "✦": "sparkle", "✧": "outline sparkle", "★": "star", "☆": "outline star",
  "✷": "decorative star", "✹": "sunburst", "❋": "flower", "❈": "flower",
  "❖": "diamond", "※": "asterisk", "〰": "zigzag wavy line", "〜": "wave",
  "⚡": "lightning bolt", "☼": "sun", "☾": "moon", "♧": "clover",
  "→": "right arrow", "↗": "up right arrow", "↘": "down right arrow",
  "↙": "down left arrow", "↖": "up left arrow", "↔": "left right arrow",
  "↕": "up down arrow", "➜": "bold right arrow", "➤": "pointer arrow",
  "➝": "thin arrow", "⤴": "turn up arrow", "⤵": "turn down arrow",
  "⇢": "right arrow", "⇄": "two way arrows", "⟶": "long arrow", "⟷": "long double arrow",
  "●": "filled circle", "○": "circle", "■": "filled square", "□": "square",
  "▲": "filled triangle", "△": "triangle", "◆": "filled diamond", "◇": "diamond",
  "⬟": "pentagon", "⬡": "hexagon", "✓": "check", "✔": "check mark",
  "✕": "cross close", "＋": "plus", "−": "minus", "∞": "infinity",
  "∑": "sum", "∏": "product", "√": "square root", "≈": "approximately",
  "≠": "not equal", "≤": "less than or equal", "≥": "greater than or equal",
  "÷": "divide", "×": "multiply", "∴": "therefore", "∵": "because",
  "⊕": "plus circle", "⊗": "multiply circle", "∩": "intersection",
  "∪": "union", "∠": "angle",
};

const ICON_COLORS = [
  "#7C3AED", "#2563EB", "#06B6D4", "#10B981",
  "#F59E0B", "#F97316", "#EC4899", "#EF4444",
  "#1E293B", "#64748B",
];

export default function WhiteboardBottomToolbar({
  onInsertNote,
  onInsertEmoji,
  onInsertIcon,
  disabled = false,
}: WhiteboardBottomToolbarProps) {
  const [activePanel, setActivePanel] = useState<PickerPanel>(null);
  const [iconSearch, setIconSearch] = useState("");
  const [iconColor, setIconColor] = useState("#7C3AED");
  const [customNoteColor, setCustomNoteColor] = useState("#FEF08A");

  const visibleIconGroups = useMemo(() => {
    const query = iconSearch.trim().toLowerCase();
    if (!query) return ICON_GROUPS;
    return ICON_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        `${item} ${ICON_LABELS[item] ?? ""} ${group.title}`.toLowerCase().includes(query),
      ),
    })).filter((group) => group.items.length > 0);
  }, [iconSearch]);

  const togglePanel = (panel: Exclude<PickerPanel, null>) => {
    setActivePanel((current) => (current === panel ? null : panel));
  };

  const handleEmojiClick = (data: EmojiClickData) => {
    onInsertEmoji(data.emoji);
  };

  return (
    <div className="wb-bottom-tools-root">
      {activePanel && (
        <section
          className={`wb-tool-popover wb-tool-popover-${activePanel}`}
          aria-label={`${activePanel} picker`}
        >
          <div className="wb-popover-heading">
            <div className="wb-popover-heading-icon">
              {activePanel === "notes" && <StickyNote size={17} />}
              {activePanel === "emoji" && <Smile size={17} />}
              {activePanel === "icons" && <Shapes size={17} />}
            </div>
            <div className="wb-popover-heading-copy">
              <strong>
                {activePanel === "notes" ? "Sticky notes" : activePanel === "emoji" ? "Emoji library" : "Icon library"}
              </strong>
              <span>
                {activePanel === "notes"
                  ? "Choose a color to add a note"
                  : activePanel === "emoji"
                    ? "Search and select an emoji"
                    : "Add a symbol, then customize it"}
              </span>
            </div>
            <button
              type="button"
              className="wb-popover-close"
              aria-label="Close picker"
              onClick={() => setActivePanel(null)}
            >
              <X size={17} />
            </button>
          </div>

          {activePanel === "notes" && (
            <div className="wb-notes-panel">
              <div className="wb-note-gallery">
                {NOTE_COLORS.map(({ name, color }) => (
                  <button
                    key={color}
                    type="button"
                    className="wb-note-swatch"
                    style={{ backgroundColor: color }}
                    title={`Add ${name.toLowerCase()} note`}
                    onClick={() => onInsertNote(color)}
                  >
                    <span className="wb-note-swatch-lines" />
                    <span className="wb-note-swatch-label">{name}</span>
                    <span className="wb-note-add"><Check size={13} /></span>
                  </button>
                ))}
              </div>
              <div className="wb-custom-note-row">
                <label htmlFor="wb-custom-note-color">Custom note color</label>
                <input
                  id="wb-custom-note-color"
                  type="color"
                  value={customNoteColor}
                  onChange={(event) => setCustomNoteColor(event.target.value)}
                />
                <button type="button" onClick={() => onInsertNote(customNoteColor)}>
                  <PlusIcon />
                  Add note
                </button>
              </div>
              <p className="wb-picker-hint">Tip: double-click the note text on the canvas to start writing.</p>
            </div>
          )}

          {activePanel === "emoji" && (
            <div className="wb-emoji-panel">
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                theme={Theme.LIGHT}
                height={350}
                width="100%"
                searchPlaceholder="Search all emojis..."
                previewConfig={{ showPreview: false }}
                skinTonesDisabled={false}
                lazyLoadEmojis
              />
              <p className="wb-picker-hint">Select an emoji to place it on the canvas. Keep the picker open to add more.</p>
            </div>
          )}

          {activePanel === "icons" && (
            <div className="wb-icons-panel">
              <label className="wb-icon-search">
                <Search size={16} />
                <input
                  value={iconSearch}
                  onChange={(event) => setIconSearch(event.target.value)}
                  placeholder="Search symbols or categories..."
                />
              </label>

              <div className="wb-icon-color-row">
                <span>Icon color</span>
                <div className="wb-icon-colors">
                  {ICON_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Use icon color ${color}`}
                      title={color}
                      className={iconColor === color ? "selected" : ""}
                      style={{ backgroundColor: color }}
                      onClick={() => setIconColor(color)}
                    />
                  ))}
                  <label className="wb-icon-custom-color" title="Choose custom icon color">
                    <input
                      type="color"
                      value={iconColor}
                      onChange={(event) => setIconColor(event.target.value)}
                      aria-label="Custom icon color"
                    />
                  </label>
                </div>
              </div>

              <div className="wb-icon-groups">
                {visibleIconGroups.length === 0 ? (
                  <p className="wb-no-icons">No symbols match that search.</p>
                ) : visibleIconGroups.map((group) => (
                  <section key={group.title} className="wb-icon-group">
                    <h4>{group.title}</h4>
                    <div className="wb-icon-grid">
                      {group.items.map((symbol, index) => (
                        <button
                          key={`${group.title}-${symbol}-${index}`}
                          type="button"
                          title={`Add ${symbol}`}
                          aria-label={`Add symbol ${symbol}`}
                          onClick={() => onInsertIcon(symbol, iconColor)}
                        >
                          <span style={{ color: iconColor }}>{symbol}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              <p className="wb-picker-hint">Symbols are inserted as editable text elements, so you can move, resize, recolor, rotate, duplicate, and delete them.</p>
            </div>
          )}
        </section>
      )}

      <nav className="wb-bottom-toolbar" aria-label="Whiteboard quick insert tools">
        <button
          type="button"
          className={`wb-bottom-tool ${activePanel === "notes" ? "active" : ""}`}
          aria-expanded={activePanel === "notes"}
          onClick={() => togglePanel("notes")}
          disabled={disabled}
        >
          <span className="wb-bottom-tool-icon notes"><StickyNote size={17} /></span>
          <span>Notes</span>
        </button>
        <span className="wb-bottom-divider" />
        <button
          type="button"
          className={`wb-bottom-tool ${activePanel === "emoji" ? "active" : ""}`}
          aria-expanded={activePanel === "emoji"}
          onClick={() => togglePanel("emoji")}
          disabled={disabled}
        >
          <span className="wb-bottom-tool-icon emoji"><Smile size={17} /></span>
          <span>Emoji</span>
        </button>
        <span className="wb-bottom-divider" />
        <button
          type="button"
          className={`wb-bottom-tool ${activePanel === "icons" ? "active" : ""}`}
          aria-expanded={activePanel === "icons"}
          onClick={() => togglePanel("icons")}
          disabled={disabled}
        >
          <span className="wb-bottom-tool-icon icons"><Shapes size={17} /></span>
          <span>Icons</span>
        </button>
      </nav>
    </div>
  );
}

function PlusIcon() {
  return <Sparkles size={14} />;
}
