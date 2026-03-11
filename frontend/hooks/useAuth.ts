"use client";

import { useContext } from "react";
import { AuthContext } from "@/context/authprovider";

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro do AuthProvider");
  }

  return context;
}