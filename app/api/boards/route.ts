import { auth, currentUser } from "@clerk/nextjs/server";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { db, users, boards } from "@/db";

// ==========================================
// GET: FETCH BOARDS FOR THE SIGNED-IN USER
// ==========================================

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Please sign in to view your boards." },
        { status: 401 }
      );
    }

    const user = await currentUser();

    const email = user?.primaryEmailAddress?.emailAddress;

    if (!email) {
      return NextResponse.json(
        { error: "User email address not found." },
        { status: 400 }
      );
    }

    const userBoards = await db
      .select()
      .from(boards)
      .where(eq(boards.userEmail, email))
      .orderBy(desc(boards.createdAt));

    return NextResponse.json({
      success: true,
      boards: userBoards,
    });
  } catch (error) {
    console.error("GET /api/boards failed:", error);

    return NextResponse.json(
      { error: "Failed to retrieve boards." },
      { status: 500 }
    );
  }
}

// ==========================================
// POST: CREATE A BOARD
// ==========================================

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Please sign in to create a board." },
        { status: 401 }
      );
    }

    const user = await currentUser();

    const email = user?.primaryEmailAddress?.emailAddress;

    if (!email) {
      return NextResponse.json(
        { error: "User email address not found." },
        { status: 400 }
      );
    }

    // Ensure that the user has a database record.
    // Create one if the /api/users initialization request hasn't run yet.
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length === 0) {
      await db
        .insert(users)
        .values({
          name: user.fullName || user.firstName || "User",
          email,
        })
        .onConflictDoNothing({
          target: users.email,
        });
    }

    // Parse request body.
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request data." },
        { status: 400 }
      );
    }

    const payload = body as {
      projectName?: unknown;
      description?: unknown;
    };

    const projectName =
      typeof payload.projectName === "string"
        ? payload.projectName.trim()
        : "";

    const description =
      typeof payload.description === "string"
        ? payload.description.trim()
        : "";

    if (!projectName) {
      return NextResponse.json(
        { error: "Please enter a board name." },
        { status: 400 }
      );
    }

    if (projectName.length > 255) {
      return NextResponse.json(
        { error: "Board name cannot exceed 255 characters." },
        { status: 400 }
      );
    }

    if (description.length > 500) {
      return NextResponse.json(
        { error: "Description cannot exceed 500 characters." },
        { status: 400 }
      );
    }

    // Insert the board into Neon PostgreSQL.
    const [newBoard] = await db
      .insert(boards)
      .values({
        projectId: randomUUID(),
        projectName,
        description: description || null,
        userEmail: email,
      })
      .returning();

    if (!newBoard) {
      return NextResponse.json(
        { error: "The board could not be saved." },
        { status: 500 }
      );
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

    return NextResponse.json(
      { error: "Failed to save your board. Please try again." },
      { status: 500 }
    );
  }
}