import { db, users } from "@/db";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

// ==========================================
// POST: CREATE OR FETCH USER
// ==========================================

export async function POST() {
  try {
    // Verify authentication.
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        {
          message: "User not found. Please sign in.",
        },
        { status: 401 }
      );
    }

    // Retrieve the authenticated Clerk user.
    const user = await currentUser();

    if (!user) {
      return NextResponse.json(
        {
          message: "Unable to retrieve your account.",
        },
        { status: 401 }
      );
    }

    // Get the primary email address.
    const email = user.primaryEmailAddress?.emailAddress;

    if (!email) {
      return NextResponse.json(
        {
          message: "User email address not found.",
        },
        { status: 400 }
      );
    }

    // Check whether the user already exists.
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUsers.length > 0) {
      return NextResponse.json(existingUsers[0], {
        status: 200,
      });
    }

    // Insert the new user.
    // onConflictDoNothing protects against duplicate-email inserts
    // if multiple requests arrive at the same time.
    const result = await db
      .insert(users)
      .values({
        name: user.fullName || user.firstName || "User",
        email,
      })
      .onConflictDoNothing({
        target: users.email,
      })
      .returning();

    if (result.length > 0) {
      return NextResponse.json(result[0], {
        status: 201,
      });
    }

    // Another request may have created the user concurrently.
    const concurrentUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (concurrentUser.length > 0) {
      return NextResponse.json(concurrentUser[0], {
        status: 200,
      });
    }

    return NextResponse.json(
      {
        message: "Unable to create or retrieve the user.",
      },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error in POST /api/users:", error);

    return NextResponse.json(
      {
        message: "Internal server error while processing the user.",
      },
      { status: 500 }
    );
  }
}