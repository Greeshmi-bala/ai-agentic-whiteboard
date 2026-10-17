import { auth, currentUser } from "@clerk/nextjs/server";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { db, users, boards } from "@/db";

// ==================================================
// HELPER: JSON ERROR RESPONSE
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
// HELPER: GET AUTHENTICATED USER EMAIL
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
    user,
  };
}

// ==================================================
// GET: FETCH BOARDS FOR THE SIGNED-IN USER
// GET /api/boards
// ==================================================

export async function GET() {
  try {
    const result = await getAuthenticatedEmail();

    if (!result.email) {
      return result.error!;
    }

    const userBoards = await db
      .select()
      .from(boards)
      .where(eq(boards.userEmail, result.email))
      .orderBy(desc(boards.createdAt));

    return NextResponse.json(
      {
        success: true,
        boards: userBoards,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/boards failed:", error);

    return jsonError("Failed to retrieve boards.", 500);
  }
}

// ==================================================
// POST: CREATE A BOARD
// POST /api/boards
// ==================================================

export async function POST(request: Request) {
  try {
    const result = await getAuthenticatedEmail();

    if (!result.email) {
      return result.error!;
    }

    const { email, user } = result;

    // Ensure the user exists in the database.
    await db
      .insert(users)
      .values({
        name: user?.fullName || user?.firstName || "User",
        email,
      })
      .onConflictDoNothing({
        target: users.email,
      });

    // Parse the request body.
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid request body.", 400);
    }

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return jsonError("Invalid request data.", 400);
    }

    const payload = body as Record<string, unknown>;

    const projectName =
      typeof payload.projectName === "string"
        ? payload.projectName.trim()
        : "";

    const description =
      typeof payload.description === "string"
        ? payload.description.trim()
        : "";

    // Validate the project name.
    if (!projectName) {
      return jsonError("Please enter a board name.", 400);
    }

    if (projectName.length > 255) {
      return jsonError(
        "Board name cannot exceed 255 characters.",
        400
      );
    }

    if (description.length > 500) {
      return jsonError(
        "Description cannot exceed 500 characters.",
        400
      );
    }

    // Save the board to Neon PostgreSQL.
    const projectId = randomUUID();

    const [newBoard] = await db
      .insert(boards)
      .values({
        projectId,
        projectName,
        description: description || null,
        userEmail: email,
      })
      .returning();

    if (!newBoard) {
      return jsonError("The board could not be saved.", 500);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Board created successfully.",
        board: newBoard,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/boards failed:", error);

    return jsonError(
      "Failed to save your board. Please try again.",
      500
    );
  }
}