import { db, users } from "@/db";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Get the currently authenticated Clerk user
    const user = await currentUser();

    // Check whether the user is authenticated
    if (!user) {
      return NextResponse.json(
        { message: "User not found. Please sign in." },
        { status: 401 }
      );
    }

    // Get the user's primary email address
    const email = user.primaryEmailAddress?.emailAddress;

    if (!email) {
      return NextResponse.json(
        { message: "User email address not found." },
        { status: 400 }
      );
    }

    // Check whether the user already exists in the database
    const userData = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    // Return the existing user if found
    if (userData.length > 0) {
      return NextResponse.json(userData[0]);
    }

    // Create a new user if they do not exist
    const result = await db
      .insert(users)
      .values({
        name: user.fullName,
        email: email,
      })
      .returning();

    // Return the newly created user
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/users:", error);

    return NextResponse.json(
      { message: "Internal server error while processing the user." },
      { status: 500 }
    );
  }
}