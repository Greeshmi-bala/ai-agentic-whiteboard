"use client";

import { createContext } from "react";

interface UserDetail {
  [key: string]: unknown;
}

interface UserDetailContextType {
  userDetail: UserDetail | null;
  setUserDetail: React.Dispatch<
    React.SetStateAction<UserDetail | null>
  >;
}

export const UserDetailContext =
  createContext<UserDetailContextType | null>(null);