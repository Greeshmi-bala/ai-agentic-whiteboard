import { auth, currentUser } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, boards } from "@/db";

// ==================================================
// TYPES
// ==================================================

interface RouteContext {
  params: Promise<{
    projectid: string;
  }>;
}

interface UpdateBoardPayload {
  projectName?: unknown;
  description?: unknown;
  whiteboardContent?: unknown;
  documentContent?: unknown;
}

// ==================================================
// JSON ERROR
// ==================================================

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

// ==================================================
// AUTHENTICATION
// ==================================================

async function getAuthenticatedEmail() {
  const { userId } = await auth();

  if (!userId) {
    return {
      email: null,
      error: jsonError("Please sign in to continue.", 401),
    };
  }

  const user = await currentUser();

  const email = user?.primaryEmailAddress?.emailAddress;

  if (!email) {
    return {
      email: null,
      error: jsonError("User email address not found.", 400),
    };
  }

  return {
    email,
    error: null,
  };
}

// ==================================================
// GET: LOAD ONE BOARD
// ==================================================

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const authResult = await getAuthenticatedEmail();

    if (!authResult.email) {
      return authResult.error!;
    }

    const { projectid } = await context.params;

    if (!projectid) {
      return jsonError("Project ID is required.", 400);
    }

    const [board] = await db
      .select()
      .from(boards)
      .where(
        and(
          eq(boards.projectId, projectid),
          eq(boards.userEmail, authResult.email)
        )
      )
      .limit(1);

    if (!board) {
      return jsonError(
        "Workspace not found or you do not have access.",
        404
      );
    }

    return NextResponse.json(
      {
        success: true,
        board: {
          ...board,
          whiteboardContent: board.whiteboardContent || "[]",
          documentContent: board.documentContent || "",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/boards/[projectid] failed:", error);

    return jsonError("Failed to load workspace.", 500);
  }
}

// ==================================================
// PATCH: SAVE BOARD CHANGES
// ==================================================

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const authResult = await getAuthenticatedEmail();

    if (!authResult.email) {
      return authResult.error!;
    }

    const { projectid } = await context.params;

    if (!projectid) {
      return jsonError("Project ID is required.", 400);
    }

    let body: UpdateBoardPayload;

    try {
      body = (await request.json()) as UpdateBoardPayload;
    } catch {
      return jsonError("Invalid JSON request body.", 400);
    }

    const updates: {
      projectName?: string;
      description?: string | null;
      whiteboardContent?: string;
      documentContent?: string;
      updatedAt?: Date;
    } = {};

    if (body.projectName !== undefined) {
      if (
        typeof body.projectName !== "string" ||
        !body.projectName.trim()
      ) {
        return jsonError("Board name cannot be empty.", 400);
      }

      if (body.projectName.trim().length > 255) {
        return jsonError(
          "Board name cannot exceed 255 characters.",
          400
        );
      }

      updates.projectName = body.projectName.trim();
    }

    if (body.description !== undefined) {
      if (typeof body.description !== "string") {
        return jsonError("Invalid board description.", 400);
      }

      if (body.description.length > 500) {
        return jsonError(
          "Description cannot exceed 500 characters.",
          400
        );
      }

      updates.description = body.description.trim() || null;
    }

    if (body.whiteboardContent !== undefined) {
      if (typeof body.whiteboardContent !== "string") {
        return jsonError("Invalid whiteboard content.", 400);
      }

      if (body.whiteboardContent.length > 5_000_000) {
        return jsonError(
          "Whiteboard content is too large to save.",
          413
        );
      }

      try {
        const parsed: unknown = JSON.parse(
          body.whiteboardContent
        );

        if (
          !Array.isArray(parsed) &&
          (
            typeof parsed !== "object" ||
            parsed === null ||
            !("elements" in parsed) ||
            !Array.isArray(parsed.elements)
          )
        ) {
          return jsonError(
            "Whiteboard data must contain an elements array.",
            400
          );
        }
      } catch {
        return jsonError(
          "Whiteboard content must be valid JSON.",
          400
        );
      }

      updates.whiteboardContent = body.whiteboardContent;
    }

    if (body.documentContent !== undefined) {
      if (typeof body.documentContent !== "string") {
        return jsonError("Invalid document content.", 400);
      }

      if (body.documentContent.length > 1_000_000) {
        return jsonError(
          "Document content is too large to save.",
          413
        );
      }

      updates.documentContent = body.documentContent;
    }

    if (Object.keys(updates).length === 0) {
      return jsonError("No changes were provided.", 400);
    }

    updates.updatedAt = new Date();

    const [updatedBoard] = await db
      .update(boards)
      .set(updates)
      .where(
        and(
          eq(boards.projectId, projectid),
          eq(boards.userEmail, authResult.email)
        )
      )
      .returning();

    if (!updatedBoard) {
      return jsonError(
        "Workspace not found or you do not have access.",
        404
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
    console.error("PATCH /api/boards/[projectid] failed:", error);

    return jsonError("Failed to save workspace.", 500);
  }
}