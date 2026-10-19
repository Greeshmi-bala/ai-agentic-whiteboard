import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 60;

// ============================================================
// TYPES
// ============================================================

type DiagramNode = {
  id: string;
  label: string;
  shape?: "rectangle" | "diamond" | "ellipse";
};

type DiagramEdge = {
  from: string;
  to: string;
  label?: string;
};

type Diagram = {
  title?: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
};

// ============================================================
// AI TOOL INSTRUCTIONS
// ============================================================

const toolInstructions: Record<string, string> = {
  diagram:
    "Create a clean, readable conceptual diagram with a concise title, short labels, clear hierarchy, and a small number of meaningful relationships. Prefer 6–12 nodes; never exceed 16 nodes unless the user explicitly asks for a large diagram. Avoid decorative or redundant nodes.",

  flowchart:
    "Create a professional, uncluttered flowchart. Use ellipse for genuine start/end nodes, rectangle for actions, and diamond for decisions. Keep labels short (2–5 words). Use one primary top-to-bottom path, with only necessary branches. Label decision edges Yes/No or similarly short outcomes. Rejoin branches at shared continuation nodes. Prefer 6–12 nodes and never exceed 16 unless explicitly requested.",

  architecture:
    "Create a readable software/system architecture diagram with distinct layers (client, frontend, backend/services, data stores, external integrations only when relevant). Keep each layer aligned, labels concise, and arrows flowing in one clear direction. Avoid unnecessary components and edge crossings. Prefer 6–12 nodes and never exceed 16 unless explicitly requested.",

  web:
    "Create a clean website wireframe as a structured hierarchy: announcement/header/navigation, hero/search, primary content sections, calls to action, newsletter, footer. Use 6–12 short-labeled blocks, aligned into clear rows. Connect only true parent/child or navigation relationships. Do not create unrelated cross-links or overlapping hierarchy.",

  mobile:
    "Create a mobile app wireframe as a compact vertical hierarchy: status/app bar, primary content, actions, and bottom navigation. Use 5–10 short-labeled blocks, align them in reading order, and connect only genuine parent/child relationships.",
};

// ============================================================
// ERROR UTILITIES
// ============================================================

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const value = error as {
    status?: number | string;
    code?: number | string;
    error?: {
      status?: number | string;
      code?: number | string;
    };
  };

  const status = Number(
    value.status ??
      value.code ??
      value.error?.code ??
      value.error?.status
  );

  return Number.isFinite(status) ? status : undefined;
}

function isRetryableError(error: unknown): boolean {
  const status = getErrorStatus(error);

  return (
    status === 408 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// GEMINI GENERATION WITH AUTOMATIC RETRIES
// ============================================================

async function generateWithRetry(
  ai: GoogleGenAI,
  model: string,
  contents: string,
  maxAttempts = 3
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.info(
        `[Gemini] Generating diagram with ${model}. Attempt ${attempt}/${maxAttempts}.`
      );

      return await ai.models.generateContent({
        model,
        contents,
        config: {
          responseMimeType: "application/json",
          temperature: 0.35,
          maxOutputTokens: 8192,
        },
      });
    } catch (error: unknown) {
      lastError = error;

      if (!isRetryableError(error) || attempt === maxAttempts) {
        throw error;
      }

      // Exponential backoff with a small random delay.
      const delay =
        1000 * 2 ** (attempt - 1) + Math.floor(Math.random() * 300);

      console.warn(
        `[Gemini] Temporary error. Retrying in ${delay}ms.`,
        getErrorStatus(error)
      );

      await wait(delay);
    }
  }

  throw lastError;
}

// ============================================================
// GEMINI MODEL FALLBACK
// ============================================================

async function generateWithFallback(
  ai: GoogleGenAI,
  primaryModel: string,
  fallbackModel: string | undefined,
  contents: string
) {
  try {
    return {
      result: await generateWithRetry(ai, primaryModel, contents),
      model: primaryModel,
    };
  } catch (error: unknown) {
    // Only try the fallback for temporary availability/rate-limit errors.
    if (
      !isRetryableError(error) ||
      !fallbackModel ||
      fallbackModel === primaryModel
    ) {
      throw error;
    }

    console.warn(
      `[Gemini] Primary model ${primaryModel} failed. Trying fallback model ${fallbackModel}.`
    );

    return {
      result: await generateWithRetry(ai, fallbackModel, contents),
      model: fallbackModel,
    };
  }
}

// ============================================================
// PARSE AND VALIDATE GEMINI JSON
// ============================================================

function parseDiagram(text: string): Diagram {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  let parsed: any;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      "Gemini returned invalid JSON. Please try generating the diagram again."
    );
  }

  if (
    !parsed ||
    !Array.isArray(parsed.nodes) ||
    !Array.isArray(parsed.edges)
  ) {
    throw new Error(
      "Gemini returned an invalid diagram structure."
    );
  }

  const nodes: DiagramNode[] = parsed.nodes
    .slice(0, 24)
    .map((node: any, index: number) => {
      const shapeValue = String(node?.shape ?? "").toLowerCase();

      let shape: DiagramNode["shape"] = "rectangle";

      if (["diamond", "decision"].includes(shapeValue)) {
        shape = "diamond";
      } else if (
        ["ellipse", "start", "end", "terminator"].includes(shapeValue)
      ) {
        shape = "ellipse";
      }

      return {
        id: String(node?.id ?? `n${index + 1}`).slice(0, 50),
        label: String(node?.label ?? `Step ${index + 1}`)
          .trim()
          .slice(0, 180),
        shape,
      };
    });

  if (nodes.length === 0) {
    throw new Error(
      "Gemini returned no diagram nodes. Please try a more specific prompt."
    );
  }

  // Duplicate IDs make edge connections ambiguous.
  const nodeIds = new Set<string>();

  for (const node of nodes) {
    if (nodeIds.has(node.id)) {
      throw new Error(
        "Gemini returned duplicate node IDs. Please generate the diagram again."
      );
    }

    nodeIds.add(node.id);
  }

  const edges: DiagramEdge[] = parsed.edges
    .slice(0, 40)
    .filter(
      (edge: any) =>
        edge &&
        nodeIds.has(String(edge.from)) &&
        nodeIds.has(String(edge.to))
    )
    .map((edge: any) => ({
      from: String(edge.from),
      to: String(edge.to),
      ...(edge.label
        ? {
            label: String(edge.label).slice(0, 80),
          }
        : {}),
    }));

  return {
    title: String(parsed.title ?? "AI Generated Diagram").slice(0, 120),
    nodes,
    edges,
  };
}

// ============================================================
// POST /api/ai
// ============================================================

export async function POST(request: Request) {
  try {
    // --------------------------------------------------------
    // 1. Validate API key
    // --------------------------------------------------------

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GEMINI_AI_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Gemini API key is missing. Set GEMINI_API_KEY or GEMINI_AI_KEY in .env.local.",
        },
        { status: 500 }
      );
    }

    // --------------------------------------------------------
    // 2. Validate incoming request
    // --------------------------------------------------------

    let body: any;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const tool = String(body?.tool ?? "diagram");
    const prompt = String(body?.prompt ?? "").trim();

    if (!prompt) {
      return NextResponse.json(
        {
          error:
            "Please describe what you want to create.",
        },
        { status: 400 }
      );
    }

    if (prompt.length > 4000) {
      return NextResponse.json(
        {
          error:
            "Your prompt is too long. Please keep it under 4,000 characters.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // 3. Initialize Gemini
    // --------------------------------------------------------

    const ai = new GoogleGenAI({ apiKey });

    const primaryModel =
      process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const fallbackModel =
      process.env.GEMINI_FALLBACK_MODEL?.trim() || undefined;

    const instruction =
      toolInstructions[tool] || toolInstructions.diagram;

    // --------------------------------------------------------
    // 4. Prepare structured diagram prompt
    // --------------------------------------------------------

    const contents = [
      "You are an AI diagram generator for an Excalidraw-style whiteboard.",
      "Return ONLY valid JSON. Do not include Markdown or explanations.",
      "",
      instruction,
      "",
      "Required JSON schema:",
      JSON.stringify({
        title: "Short diagram title",
        nodes: [
          {
            id: "n1",
            label: "Short label",
            shape: "ellipse",
          },
          {
            id: "n2",
            label: "Process step",
            shape: "rectangle",
          },
          {
            id: "n3",
            label: "Decision",
            shape: "diamond",
          },
        ],
        edges: [
          {
            from: "n1",
            to: "n2",
            label: "Optional connector label",
          },
        ],
      }),
      "",
      "Rules:",
      "- Generate 6 to 12 useful nodes for a typical request; use fewer for simple requests. Never exceed 16 nodes unless the user explicitly asks for a large diagram.",
      "- Give the diagram a concise, meaningful title.",
      "- Every node ID must be unique and stable within this response (n1, n2, n3...).",
      "- Every edge must reference existing node IDs. Never invent missing IDs.",
      "- Use concise, readable labels (usually 2–5 words and preferably under 32 characters). Avoid long sentences inside nodes.",
      "- Use ellipses only for genuine start/end nodes, rectangles for process/component nodes, and diamonds only for genuine decisions.",
      "- Keep the nodes array in the same logical order as the primary workflow, from start to finish.",
      "- For a sequential flowchart, connect each step to the next step in order with exactly one forward edge per step.",
      "- Never connect a terminal End/Complete node to a later decision. Decisions must appear before their resulting outcomes.",
      "- For decision nodes, create one outgoing edge for each outcome and label each branch (for example Yes/No or Success/Retry).",
      "- When a branch rejoins, connect its paths to a shared continuation node rather than duplicating the remaining workflow.",
      "- Do not connect unrelated nodes. Avoid duplicate edges, unnecessary crossings, disconnected nodes, and cycles unless a real retry/feedback loop is required. Keep the graph close to a tree/DAG with a clear reading direction.",
      "- For retry loops, connect the retry edge to the appropriate earlier process and keep the success path moving forward.",
      "- Prefer a clear primary path with a small number of side branches over a grid of unrelated nodes.",
      "- Use edge labels sparingly and keep them short enough to fit beside a connector.",
      "- Make the result informative but not cluttered. Do not repeat the same idea across many nodes.",
      "- Return only the schema fields shown above; do not include layout coordinates or styling properties.",
      "",
      `Selected tool: ${tool}`,
      `User request: ${prompt}`,
    ].join("\n");

    // --------------------------------------------------------
    // 5. Generate with retry and optional fallback
    // --------------------------------------------------------

    let generated: Awaited<
      ReturnType<typeof generateWithFallback>
    >;

    try {
      generated = await generateWithFallback(
        ai,
        primaryModel,
        fallbackModel,
        contents
      );
    } catch (error: unknown) {
      console.error(
        "[/api/ai] Gemini generation failed:",
        error
      );

      const status = getErrorStatus(error);

      if (status === 503 || status === 502 || status === 504) {
        return NextResponse.json(
          {
            error:
              "Gemini is temporarily unavailable. Please try again shortly. If this continues, configure a supported fallback model.",
            code: status,
          },
          { status: 503 }
        );
      }

      if (status === 429) {
        return NextResponse.json(
          {
            error:
              "Gemini's rate limit or quota has been reached. Please wait before trying again.",
            code: status,
          },
          { status: 429 }
        );
      }

      if (status === 401 || status === 403) {
        return NextResponse.json(
          {
            error:
              "Gemini rejected the API request. Check your API key and model access.",
            code: status,
          },
          { status: status }
        );
      }

      throw error;
    }

    // --------------------------------------------------------
    // 6. Validate Gemini response
    // --------------------------------------------------------

    const responseText = generated.result.text;

    if (!responseText) {
      return NextResponse.json(
        {
          error:
            "Gemini returned an empty response. Please try again.",
        },
        { status: 502 }
      );
    }

    const diagram = parseDiagram(responseText);

    // --------------------------------------------------------
    // 7. Return diagram to whiteboard frontend
    // --------------------------------------------------------

    return NextResponse.json({
      success: true,
      diagram,
      model: generated.model,
    });
  } catch (error: unknown) {
    console.error(
      "[/api/ai] Unexpected generation error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred.";

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? `AI generation failed: ${message}`
            : "AI generation failed. Please try again.",
      },
      { status: 500 }
    );
  }
}