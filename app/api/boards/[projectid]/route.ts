import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, boards } from "@/db";

interface RouteContext {
  params: Promise<{
    projectId: string;
  }>;
}

// ==========================================
// HELPER: GET AUTHENTICATED USER EMAIL
// ==========================================

async function getAuthenticatedEmail(): Promise<string | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const user = await currentUser();

  return user?.primaryEmailAddress?.emailAddress ?? null;
}

// ==========================================
// HELPER: JSON ERROR RESPONSE
// ==========================================

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

// ==========================================
// GET: FETCH A SINGLE BOARD
// ==========================================

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const email = await getAuthenticatedEmail();

    if (!email) {
      return jsonError(
        "Please sign in to access this workspace.",
        401
      );
    }

    const { projectId } = await context.params;

    if (!projectId || projectId === "undefined") {
      return jsonError(
        "A valid project ID is required.",
        400
      );
    }

    const [board] = await db
      .select()
      .from(boards)
      .where(eq(boards.projectId, projectId))
      .limit(1);

    if (!board) {
      return jsonError("Workspace not found.", 404);
    }

    // Users may access only their own boards.
    if (board.userEmail !== email) {
      return jsonError(
        "You do not have permission to access this workspace.",
        403
      );
    }

    return NextResponse.json(
      {
        success: true,
        board: {
          ...board,
          // Fallbacks also support older records.
          whiteboardContent:
            board.whiteboardContent ?? "[]",
          documentContent:
            board.documentContent ?? "",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/boards/[projectId] failed:", error);

    return jsonError(
      "Failed to load the workspace. Check the server logs.",
      500
    );
  }
}

// ==========================================
// PATCH: UPDATE A BOARD
// ==========================================

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const email = await getAuthenticatedEmail();

    if (!email) {
      return jsonError(
        "Please sign in to save this workspace.",
        401
      );
    }

    const { projectId } = await context.params;

    if (!projectId || projectId === "undefined") {
      return jsonError(
        "A valid project ID is required.",
        400
      );
    }

    // Find the existing board.
    const [existingBoard] = await db
      .select()
      .from(boards)
      .where(eq(boards.projectId, projectId))
      .limit(1);

    if (!existingBoard) {
      return jsonError("Workspace not found.", 404);
    }

    // Prevent updating another user's board.
    if (existingBoard.userEmail !== email) {
      return jsonError(
        "You do not have permission to update this workspace.",
        403
      );
    }

    // Parse request body safely.
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonError(
        "The request body must contain valid JSON.",
        400
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return jsonError(
        "Invalid workspace update data.",
        400
      );
    }

    const payload = body as Record<string, unknown>;

    const updates: {
      projectName?: string;
      whiteboardContent?: string;
      documentContent?: string;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    // Validate board name when supplied.
    if (payload.projectName !== undefined) {
      if (typeof payload.projectName !== "string") {
        return jsonError(
          "Board name must be a string.",
          400
        );
      }

      const projectName = payload.projectName.trim();

      if (!projectName) {
        return jsonError(
          "Board name cannot be empty.",
          400
        );
      }

      if (projectName.length > 255) {
        return jsonError(
          "Board name cannot exceed 255 characters.",
          400
        );
      }

      updates.projectName = projectName;
    }

    // Validate whiteboard content.
    if (payload.whiteboardContent !== undefined) {
      if (
        typeof payload.whiteboardContent !== "string"
      ) {
        return jsonError(
          "Whiteboard content must be a string.",
          400
        );
      }

      if (payload.whiteboardContent.length > 5_000_000) {
        return jsonError(
          "Whiteboard content is too large.",
          413
        );
      }

      // Ensure the saved whiteboard content is valid JSON.
      try {
        JSON.parse(payload.whiteboardContent);
      } catch {
        return jsonError(
          "Whiteboard content contains invalid JSON.",
          400
        );
      }

      updates.whiteboardContent =
        payload.whiteboardContent;
    }

    // Validate document content.
    if (payload.documentContent !== undefined) {
      if (typeof payload.documentContent !== "string") {
        return jsonError(
          "Document content must be a string.",
          400
        );
      }

      if (payload.documentContent.length > 1_000_000) {
        return jsonError(
          "Document content is too large.",
          413
        );
      }

      updates.documentContent = payload.documentContent;
    }

    // Save changes in PostgreSQL.
    const [updatedBoard] = await db
      .update(boards)
      .set(updates)
      .where(eq(boards.projectId, projectId))
      .returning();

    if (!updatedBoard) {
      return jsonError(
        "The workspace could not be updated.",
        500
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Workspace saved successfully.",
        board: updatedBoard,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "PATCH /api/boards/[projectId] failed:",
      error
    );

    return jsonError(
      "Failed to save the workspace. Check the server logs.",
      500
    );
  }
}