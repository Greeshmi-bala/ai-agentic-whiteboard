"use client";

import React, {
  useEffect,
  useState,
} from "react";

import axios from "axios";

import { useAuth } from "@clerk/nextjs";

import { UserDetailContext } from "./context/UserDetailContext";

// ==================================================
// TYPES
// ==================================================

interface UserDetail {
  [key: string]: unknown;
}

// ==================================================
// PROVIDER
// ==================================================

function Provider({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    isLoaded,
    isSignedIn,
    userId,
  } = useAuth();

  const [
    userDetail,
    setUserDetail,
  ] = useState<UserDetail | null>(null);

  // ==================================================
  // CREATE OR FETCH THE APPLICATION USER
  // ==================================================

  useEffect(() => {
    // Wait until Clerk has finished initializing.
    if (!isLoaded) {
      return;
    }

    // Clear application user state after sign-out.
    if (!isSignedIn || !userId) {
      setUserDetail(null);
      return;
    }

    let cancelled = false;

    const createOrFetchUser =
      async () => {
        try {
          const response = await axios.post(
            "/api/users",
            undefined,
            {
              headers: {
                Accept: "application/json",
              },
              withCredentials: true,
            }
          );

          if (cancelled) {
            return;
          }

          setUserDetail(response.data);

          if (
            process.env.NODE_ENV ===
            "development"
          ) {
            console.debug(
              "[Provider] Application user loaded."
            );
          }
        } catch (error: unknown) {
          if (cancelled) {
            return;
          }

          if (axios.isAxiosError(error)) {
            console.error(
              "[Provider] Failed to initialize application user.",
              {
                status:
                  error.response?.status,
                message: error.message,
                response:
                  error.response?.data,
              }
            );
          } else {
            console.error(
              "[Provider] Unexpected user initialization error:",
              error
            );
          }
        }
      };

    void createOrFetchUser();

    return () => {
      cancelled = true;
    };
  }, [
    isLoaded,
    isSignedIn,
    userId,
  ]);

  // ==================================================
  // CONTEXT
  // ==================================================

  return (
    <UserDetailContext.Provider
      value={{
        userDetail,
        setUserDetail,
      }}
    >
      {children}
    </UserDetailContext.Provider>
  );
}

export default Provider;