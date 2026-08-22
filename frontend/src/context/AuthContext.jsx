import { createContext, useContext, useMemo, useState } from "react";
import { login as loginRequest, register as registerRequest } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("auth_user");
    return stored ? JSON.parse(stored) : null;
  });

  const persistSession = (tokenResponse) => {
    localStorage.setItem("access_token", tokenResponse.access_token);
    localStorage.setItem("auth_user", JSON.stringify(tokenResponse.user));
    setUser(tokenResponse.user);
  };

  const login = async (email, password) => {
    const tokenResponse = await loginRequest(email, password);
    persistSession(tokenResponse);
  };

  const register = async (email, password, role) => {
    const tokenResponse = await registerRequest(email, password, role);
    persistSession(tokenResponse);
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("auth_user");
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, login, register, logout, isAuthenticated: Boolean(user) }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
