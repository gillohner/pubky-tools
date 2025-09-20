"use client";

import React, { createContext, useContext, useEffect, useReducer } from "react";
import { AuthContextType, PubkySession } from "@/types/pubky";

interface AuthState {
  user: PubkySession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: "LOGIN_START" }
  | { type: "LOGIN_SUCCESS"; user: PubkySession }
  | { type: "LOGIN_ERROR" }
  | { type: "LOGOUT" }
  | { type: "UPDATE_USER"; user: Partial<PubkySession> };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOGIN_START":
      return { ...state, isLoading: true };
    case "LOGIN_SUCCESS":
      return {
        isAuthenticated: true,
        user: { ...action.user, isAuthenticated: true },
        isLoading: false,
      };
    case "LOGIN_ERROR":
      return {
        isAuthenticated: false,
        user: null,
        isLoading: false,
      };
    case "LOGOUT":
      return {
        isAuthenticated: false,
        user: null,
        isLoading: false,
      };
    case "UPDATE_USER":
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.user } : null,
      };
    default:
      return state;
  }
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: false,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("pubky-user");
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser) as PubkySession;
        dispatch({ type: "LOGIN_SUCCESS", user });
      } catch (error) {
        console.error("Failed to parse saved user:", error);
        localStorage.removeItem("pubky-user");
      }
    }
  }, []);

  const login = (user: Omit<PubkySession, "isAuthenticated">) => {
    const fullUser = { ...user, isAuthenticated: true };
    localStorage.setItem("pubky-user", JSON.stringify(fullUser));
    dispatch({ type: "LOGIN_SUCCESS", user: fullUser });
  };

  const logout = () => {
    localStorage.removeItem("pubky-user");
    dispatch({ type: "LOGOUT" });
  };

  const updateUser = (user: Partial<PubkySession>) => {
    if (state.user) {
      const updatedUser = { ...state.user, ...user };
      localStorage.setItem("pubky-user", JSON.stringify(updatedUser));
      dispatch({ type: "UPDATE_USER", user });
    }
  };

  return (
    <AuthContext.Provider value={{ state, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
