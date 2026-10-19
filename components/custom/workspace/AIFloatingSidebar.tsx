"use client";

import { useState } from "react";
import {
  Sparkles,
  X,
  WandSparkles,
  Workflow,
  Network,
  Monitor,
  Smartphone,
  ArrowUpRight,
  LoaderCircle,
} from "lucide-react";

type AITool = {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof Sparkles;
  tone: string;
};

const AI_TOOLS: AITool[] = [
  {
    id: "diagram",
    title: "Generate diagram",
    subtitle: "Turn ideas into diagrams",
    icon: WandSparkles,
    tone: "blue",
  },
  {
    id: "flowchart",
    title: "Flowchart",
    subtitle: "Map steps and decisions",
    icon: Workflow,
    tone: "violet",
  },
  {
    id: "architecture",
    title: "Architecture",
    subtitle: "Generate system designs",
    icon: Network,
    tone: "orange",
  },
  {
    id: "web",
    title: "Web mockup",
    subtitle: "Sketch a website layout",
    icon: Monitor,
    tone: "pink",
  },
  {
    id: "mobile",
    title: "Mobile mockup",
    subtitle: "Create an app wireframe",
    icon: Smartphone,
    tone: "rose",
  },
];

export interface AIFloatingSidebarProps {
  onGenerate?: (tool: string, prompt: string) => void;
}

export default function AIFloatingSidebar({
  onGenerate,
}: AIFloatingSidebarProps) {
  const [open, setOpen] = useState(false);
  const [activeTool, setActiveTool] = useState("diagram");
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setMessage("Describe what you want to create first.");
      return;
    }

    setGenerating(true);
    setMessage("");

    try {
      if (onGenerate) {
        await onGenerate(activeTool, trimmed);
        setMessage("Generated successfully and added to your whiteboard.");
      } else {
        // An integration point for the app's AI route; this event does not
        // alter the canvas or call a nonexistent endpoint.
        window.dispatchEvent(
          new CustomEvent("whizboard:ai-generate", {
            detail: { tool: activeTool, prompt: trimmed },
          }),
        );
        setMessage("AI generation is not connected. Please check the whiteboard integration.");
      }
    } catch (error) {
      console.error("AI generation request failed:", error);
      setMessage("Could not send the request. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      className={`ai-float-root ${open ? "is-open" : ""}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="ai-orb"
        aria-label={open ? "Close AI Helper" : "Open AI Helper"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onFocus={() => setOpen(true)}
      >
        <span className="orb-halo" />
        <span className="orb-core">
          <Sparkles size={25} strokeWidth={2.2} />
        </span>
        <span className="orb-label">AI</span>
      </button>

      <section
        className={`ai-helper-panel ${open ? "panel-visible" : ""}`}
        aria-label="AI Helper"
        onMouseEnter={() => setOpen(true)}
      >
        <header className="ai-panel-header">
          <div className="ai-heading-icon">
            <Sparkles size={19} />
          </div>
          <div className="ai-heading-copy">
            <h3>AI Helper</h3>
            <p>Turn ideas into visuals in seconds</p>
          </div>
          <button
            type="button"
            className="ai-close"
            aria-label="Close AI Helper"
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </button>
        </header>

        <div className="ai-tool-grid">
          {AI_TOOLS.map((tool) => {
            const Icon = tool.icon;
            const selected = activeTool === tool.id;
            return (
              <button
                type="button"
                key={tool.id}
                className={`ai-tool-card tone-${tool.tone} ${selected ? "selected" : ""}`}
                onClick={() => {
                  setActiveTool(tool.id);
                  setMessage("");
                }}
                aria-pressed={selected}
              >
                <span className="ai-tool-icon"><Icon size={21} strokeWidth={2.1} /></span>
                <span className="ai-tool-copy">
                  <strong>{tool.title}</strong>
                  <small>{tool.subtitle}</small>
                </span>
                {selected && <span className="ai-selected-dot" />}
              </button>
            );
          })}
        </div>

        <label className="ai-prompt-label" htmlFor="whizboard-ai-prompt">
          Describe what you want to create
        </label>
        <textarea
          id="whizboard-ai-prompt"
          className="ai-prompt-input"
          value={prompt}
          onChange={(event) => {
            setPrompt(event.target.value);
            if (message) setMessage("");
          }}
          placeholder="E.g. Customer onboarding flow with decision points"
          rows={3}
          onFocus={() => setOpen(true)}
        />

        {message && <p className="ai-feedback" role="status">{message}</p>}

        <button
          type="button"
          className="ai-generate-button"
          onClick={submit}
          disabled={generating}
        >
          {generating ? (
            <LoaderCircle size={16} className="ai-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          {generating ? "Generating..." : "Generate"}
          {!generating && <ArrowUpRight size={15} className="ai-generate-arrow" />}
        </button>
        <div className="ai-panel-footnote">
          <span className="ai-status-light" />
          AI workspace <span>·</span> Ready to create
        </div>
      </section>

      <style jsx>{`
        .ai-float-root {
          position: absolute;
          z-index: 1000;
          top: 50%;
          right: 22px;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          justify-content: flex-end;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .ai-orb {
          position: relative;
          z-index: 2;
          width: 66px;
          height: 66px;
          border: 1px solid rgba(191, 219, 254, .98);
          border-radius: 50%;
          padding: 0;
          color: #eff8ff;
          cursor: pointer;
          isolation: isolate;
          background: linear-gradient(145deg, #dff7ff 0%, #60a5fa 22%, #2563eb 52%, #22d3ee 78%, #1d4ed8 100%);
          box-shadow: 0 0 0 5px rgba(59, 130, 246, .13), 0 0 24px rgba(37, 99, 235, .48), inset 0 1px 4px rgba(255,255,255,.8), inset 0 -5px 10px rgba(15, 45, 110, .35);
          transition: transform .25s ease, box-shadow .25s ease;
        }
        .ai-orb:hover, .is-open .ai-orb {
          transform: scale(1.07);
          box-shadow: 0 0 0 7px rgba(59, 130, 246, .17), 0 0 36px rgba(34, 211, 238, .62), inset 0 1px 4px rgba(255,255,255,.85), inset 0 -5px 10px rgba(15, 45, 110, .35);
        }
        .orb-halo {
          position: absolute;
          inset: -8px;
          z-index: -1;
          border-radius: inherit;
          border: 1px solid rgba(96, 165, 250, .62);
          animation: ai-pulse 2.6s ease-out infinite;
        }
        .orb-core {
          display: flex;
          height: 100%;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 2px 3px rgba(70, 39, 0, .65));
        }
        .orb-label {
          position: absolute;
          right: -2px;
          bottom: -3px;
          min-width: 25px;
          padding: 3px 5px;
          border-radius: 999px;
          color: #1e40af;
          background: linear-gradient(135deg, #e0f2fe, #93c5fd);
          border: 1px solid #dbeafe;
          font-size: 10px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: .8px;
          box-shadow: 0 3px 10px rgba(30, 64, 175, .25);
        }
        .ai-helper-panel {
          position: absolute;
          top: 50%;
          right: 82px;
          width: min(354px, calc(100vw - 112px));
          padding: 16px;
          border: 1px solid rgba(147, 197, 253, .8);
          border-radius: 20px;
          background: linear-gradient(155deg, #ffffff 0%, #f8fbff 58%, #eff6ff 100%);
          box-shadow: 0 22px 65px rgba(43, 30, 10, .2), 0 0 0 4px rgba(59, 130, 246, .08), inset 0 1px 0 #fff;
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transform: translate(10px, -50%) scale(.97);
          transform-origin: right center;
          transition: opacity .2s ease, transform .2s ease, visibility .2s ease;
        }
        .ai-helper-panel.panel-visible {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
          transform: translate(0, -50%) scale(1);
        }
        .ai-panel-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }
        .ai-heading-icon {
          display: grid;
          place-items: center;
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          border-radius: 12px;
          color: #1d4ed8;
          background: linear-gradient(135deg, #dbeafe, #bae6fd);
          box-shadow: inset 0 0 0 1px rgba(37, 99, 235, .14);
        }
        .ai-heading-copy { min-width: 0; flex: 1; }
        .ai-heading-copy h3 {
          margin: 0;
          color: #24201a;
          font-size: 16px;
          line-height: 1.3;
          font-weight: 800;
          letter-spacing: -.35px;
        }
        .ai-heading-copy p {
          margin: 3px 0 0;
          color: #8b8579;
          font-size: 11px;
          line-height: 1.35;
        }
        .ai-close {
          display: grid;
          place-items: center;
          width: 30px;
          height: 30px;
          border: 0;
          border-radius: 9px;
          color: #7d766b;
          background: transparent;
          cursor: pointer;
        }
        .ai-close:hover { color: #1d4ed8; background: #dbeafe; }
        .ai-tool-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 15px;
        }
        .ai-tool-card {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          min-height: 58px;
          padding: 9px 8px;
          text-align: left;
          border: 1px solid #eee9df;
          border-radius: 12px;
          background: rgba(255,255,255,.88);
          cursor: pointer;
          transition: border-color .18s ease, transform .18s ease, box-shadow .18s ease, background .18s ease;
        }
        .ai-tool-card:hover { transform: translateY(-1px); border-color: #93c5fd; box-shadow: 0 5px 14px rgba(37, 99, 235, .10); }
        .ai-tool-card.selected {
          border-color: #60a5fa;
          background: linear-gradient(135deg, #ffffff, #eff6ff);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, .12);
        }
        .ai-tool-icon {
          display: grid;
          place-items: center;
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          border-radius: 10px;
        }
        .tone-blue .ai-tool-icon { color: #4266d5; background: #e6edff; }
        .tone-violet .ai-tool-icon { color: #8b3cc5; background: #f3dcff; }
        .tone-orange .ai-tool-icon { color: #d45d2e; background: #ffe4d6; }
        .tone-pink .ai-tool-icon { color: #c84f91; background: #ffe0ef; }
        .tone-rose .ai-tool-icon { color: #c63878; background: #ffe0ec; }
        .ai-tool-copy { display: flex; flex-direction: column; min-width: 0; gap: 3px; }
        .ai-tool-copy strong {
          overflow: hidden;
          color: #34302b;
          font-size: 11px;
          line-height: 1.2;
          font-weight: 750;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ai-tool-copy small {
          overflow: hidden;
          color: #969087;
          font-size: 9px;
          line-height: 1.25;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ai-selected-dot {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, .12);
        }
        .ai-prompt-label {
          display: block;
          margin: 0 0 7px;
          color: #302b24;
          font-size: 12px;
          font-weight: 750;
        }
        .ai-prompt-input {
          display: block;
          box-sizing: border-box;
          width: 100%;
          min-height: 76px;
          resize: vertical;
          padding: 11px 12px;
          border: 1px solid #e9e3d8;
          border-radius: 12px;
          outline: none;
          color: #302b24;
          background: rgba(255,255,255,.9);
          font: inherit;
          font-size: 12px;
          line-height: 1.5;
          transition: border-color .18s ease, box-shadow .18s ease;
        }
        .ai-prompt-input::placeholder { color: #a39c91; }
        .ai-prompt-input:focus { border-color: #60a5fa; box-shadow: 0 0 0 3px rgba(59, 130, 246, .13); }
        .ai-feedback { margin: 7px 1px 0; color: #1d4ed8; font-size: 10px; line-height: 1.4; }
        .ai-generate-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          min-height: 40px;
          margin-top: 10px;
          padding: 10px 14px;
          border: 1px solid #2563eb;
          border-radius: 11px;
          color: #fffdf7;
          background: linear-gradient(100deg, #2563eb 0%, #0891b2 48%, #1d4ed8 100%);
          box-shadow: 0 5px 13px rgba(37, 99, 235, .22), inset 0 1px 0 rgba(255,255,255,.3);
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: transform .18s ease, box-shadow .18s ease, filter .18s ease;
        }
        .ai-generate-button:hover:not(:disabled) { transform: translateY(-1px); filter: saturate(1.08); box-shadow: 0 8px 17px rgba(37, 99, 235, .3); }
        .ai-generate-button:disabled { opacity: .72; cursor: wait; }
        .ai-generate-arrow { margin-left: auto; }
        .ai-panel-footnote {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 11px;
          color: #9a9388;
          font-size: 9px;
        }
        .ai-status-light { width: 6px; height: 6px; border-radius: 50%; background: #41bd83; box-shadow: 0 0 0 3px rgba(65,189,131,.12); }
        .ai-spin { animation: ai-spin .9s linear infinite; }
        @keyframes ai-spin { to { transform: rotate(360deg); } }
        @keyframes ai-pulse {
          0% { transform: scale(.88); opacity: .85; }
          75%, 100% { transform: scale(1.28); opacity: 0; }
        }
        @media (max-width: 640px) {
          .ai-float-root { right: 12px; }
          .ai-orb { width: 56px; height: 56px; }
          .ai-helper-panel { right: 68px; width: min(320px, calc(100vw - 96px)); padding: 12px; }
          .ai-tool-grid { gap: 6px; }
          .ai-tool-card { min-height: 54px; gap: 6px; padding: 7px 6px; }
          .ai-tool-icon { width: 30px; height: 30px; flex-basis: 30px; }
          .ai-tool-copy strong { font-size: 10px; }
          .ai-tool-copy small { font-size: 8px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .orb-halo, .ai-spin { animation: none; }
          .ai-orb, .ai-tool-card, .ai-helper-panel, .ai-generate-button { transition: none; }
        }
      `}</style>
    </div>
  );
}
