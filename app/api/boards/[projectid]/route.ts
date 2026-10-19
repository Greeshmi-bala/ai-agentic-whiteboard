import {
  auth,
  currentUser,
} from "@clerk/nextjs/server";

import {
  eq,
  and,
} from "drizzle-orm";

import { NextResponse } from "next/server";

import {
  db,
  boards,
} from "@/db";

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
// JSON RESPONSE HELPERS
// ==================================================

function jsonError(
  message: string,
  status: number
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

function jsonSuccess(
  data: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(
    data,
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

// ==================================================
// AUTHENTICATION
// ==================================================

async function getAuthenticatedEmail() {
  try {
    const { userId } = await auth();

    if (!userId) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[Workspace API] Clerk returned no userId."
        );
      }

      return {
        email: null,
        error: jsonError(
          "Your session is missing or expired. Please sign in again.",
          401
        ),
      };
    }

    const user = await currentUser();

    if (!user) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[Workspace API] A userId was found, but currentUser() returned no user."
        );
      }

      return {
        email: null,
        error: jsonError(
          "Unable to retrieve your account. Please sign in again.",
          401
        ),
      };
    }

    const email =
      user.primaryEmailAddress?.emailAddress;

    if (!email) {
      return {
        email: null,
        error: jsonError(
          "Your account does not have a primary email address.",
          400
        ),
      };
    }

    return {
      email,
      error: null,
    };
  } catch (error) {
    console.error(
      "[Workspace API] Clerk authentication failed:",
      error
    );

    return {
      email: null,
      error: jsonError(
        "Unable to verify your session. Please sign in again.",
        401
      ),
    };
  }
}

// ==================================================
// GET: LOAD ONE WORKSPACE
// GET /api/boards/[projectid]
// ==================================================

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    // 1. Authenticate the current user.
    const authResult =
      await getAuthenticatedEmail();

    if (!authResult.email) {
      return authResult.error!;
    }

    // 2. Resolve the dynamic route parameter.
    const { projectid } = await context.params;

    if (
      !projectid ||
      projectid === "undefined" ||
      projectid === "null"
    ) {
      return jsonError(
        "A valid project ID is required.",
        400
      );
    }

    // 3. Retrieve only a board owned by this user.
    const [board] = await db
      .select()
      .from(boards)
      .where(
        and(
          eq(
            boards.projectId,
            projectid
          ),
          eq(
            boards.userEmail,
            authResult.email
          )
        )
      )
      .limit(1);

    if (!board) {
      return jsonError(
        "Workspace not found or you do not have permission to access it.",
        404
      );
    }

    // 4. Return the saved workspace.
    return jsonSuccess(
      {
        success: true,
        board: {
          ...board,
          whiteboardContent:
            board.whiteboardContent || "[]",
          documentContent:
            board.documentContent || "",
        },
      }
    );
  } catch (error) {
    console.error(
      "GET /api/boards/[projectid] failed:",
      error
    );

    return jsonError(
      "Failed to load workspace.",
      500
    );
  }
}

// ==================================================
// PATCH: SAVE WORKSPACE CHANGES
// PATCH /api/boards/[projectid]
// ==================================================

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    // 1. Authenticate the current user.
    const authResult =
      await getAuthenticatedEmail();

    if (!authResult.email) {
      return authResult.error!;
    }

    // 2. Resolve the workspace ID.
    const { projectid } = await context.params;

    if (
      !projectid ||
      projectid === "undefined" ||
      projectid === "null"
    ) {
      return jsonError(
        "A valid project ID is required.",
        400
      );
    }

    // 3. Parse the incoming JSON.
    let body: UpdateBoardPayload;

    try {
      const parsed: unknown =
        await request.json();

      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        return jsonError(
          "Invalid request body.",
          400
        );
      }

      body = parsed as UpdateBoardPayload;
    } catch {
      return jsonError(
        "Invalid JSON request body.",
        400
      );
    }

    // 4. Validate and prepare the update.
    const updates: {
      projectName?: string;
      description?: string | null;
      whiteboardContent?: string;
      documentContent?: string;
      updatedAt?: Date;
    } = {};

    if (body.projectName !== undefined) {
      if (
        typeof body.projectName !== "string"
      ) {
        return jsonError(
          "Board name must be a string.",
          400
        );
      }

      const projectName =
        body.projectName.trim();

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

    if (body.description !== undefined) {
      if (
        body.description !== null &&
        typeof body.description !== "string"
      ) {
        return jsonError(
          "Invalid board description.",
          400
        );
      }

      if (
        typeof body.description === "string" &&
        body.description.length > 500
      ) {
        return jsonError(
          "Description cannot exceed 500 characters.",
          400
        );
      }

      updates.description =
        typeof body.description === "string"
          ? body.description.trim() || null
          : null;
    }

    if (
      body.whiteboardContent !== undefined
    ) {
      if (
        typeof body.whiteboardContent !== "string"
      ) {
        return jsonError(
          "Invalid whiteboard content.",
          400
        );
      }

      if (
        body.whiteboardContent.length >
        5_000_000
      ) {
        return jsonError(
          "Whiteboard content is too large to save.",
          413
        );
      }

      try {
        const parsed: unknown =
          JSON.parse(
            body.whiteboardContent
          );

        const validArray =
          Array.isArray(parsed);

        const validScene =
          typeof parsed === "object" &&
          parsed !== null &&
          "elements" in parsed &&
          Array.isArray(parsed.elements);

        if (!validArray && !validScene) {
          return jsonError(
            "Whiteboard data must contain an elements array or be a valid element array.",
            400
          );
        }
      } catch {
        return jsonError(
          "Whiteboard content must be valid JSON.",
          400
        );
      }

      updates.whiteboardContent =
        body.whiteboardContent;
    }

    if (body.documentContent !== undefined) {
      if (
        typeof body.documentContent !== "string"
      ) {
        return jsonError(
          "Invalid document content.",
          400
        );
      }

      if (
        body.documentContent.length >
        1_000_000
      ) {
        return jsonError(
          "Document content is too large to save.",
          413
        );
      }

      updates.documentContent =
        body.documentContent;
    }

    if (Object.keys(updates).length === 0) {
      return jsonError(
        "No changes were provided.",
        400
      );
    }

    updates.updatedAt = new Date();

    // 5. Update only a board owned by this user.
    const [updatedBoard] = await db
      .update(boards)
      .set(updates)
      .where(
        and(
          eq(
            boards.projectId,
            projectid
          ),
          eq(
            boards.userEmail,
            authResult.email
          )
        )
      )
      .returning();

    if (!updatedBoard) {
      return jsonError(
        "Workspace not found or you do not have permission to update it.",
        404
      );
    }

    // 6. Return the updated workspace.
    return jsonSuccess(
      {
        success: true,
        message: "Workspace saved successfully.",
        board: {
          ...updatedBoard,
          whiteboardContent:
            updatedBoard.whiteboardContent || "[]",
          documentContent:
            updatedBoard.documentContent || "",
        },
      }
    );
  } catch (error) {
    console.error(
      "PATCH /api/boards/[projectid] failed:",
      error
    );

    return jsonError(
      "Failed to save workspace.",
      500
    );
  }
}