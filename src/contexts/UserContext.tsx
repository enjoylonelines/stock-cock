"use client";
import type { UserInfo } from "@/types/database";
import { type ReactNode, createContext, useContext } from "react";

// context/UserContext.tsx
export const UserContext = createContext<UserInfo | null>(null);

export const UserProvider = ({ children, user }: { children: ReactNode; user: UserInfo }) => {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
