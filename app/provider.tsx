"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@clerk/nextjs";
import { UserDetailContext } from "./context/UserDetailContext";

interface UserDetail {
  [key: string]: unknown;
}

function Provider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();

  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    let isMounted = true;

    const createNewUser = async () => {
      try {
        const result = await axios.post("/api/users");

        if (isMounted) {
          console.log("User data:", result.data);
          setUserDetail(result.data);
        }
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          console.error("API status:", error.response?.status);
          console.error("API response:", error.response?.data);
          console.error("API message:", error.message);
        } else {
          console.error("Unexpected error:", error);
        }
      }
    };

    void createNewUser();

    return () => {
      isMounted = false;
    };
  }, [isLoaded, isSignedIn]);

  return (
    <UserDetailContext.Provider value={{ userDetail, setUserDetail }}>
      {children}
    </UserDetailContext.Provider>
  );
}

export default Provider;