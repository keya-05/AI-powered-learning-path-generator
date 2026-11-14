import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchMe, login as loginRequest, register as registerRequest } from "../services/api";

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

  const register = async (email, password, role, organization) => {
    const tokenResponse = await registerRequest(email, password, role, organization);
    persistSession(tokenResponse);
  };

  // After joining or leaving a school, keep the stored profile in step.
  const updateUser = useCallback((nextUser) => {
    localStorage.setItem("auth_user", JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  // Profiles saved before schools existed lack `organization`; refresh once on load.
  useEffect(() => {
    if (!localStorage.getItem("access_token")) return;
    fetchMe()
      .then(updateUser)
      .catch(() => {});
  }, [updateUser]);

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("auth_user");
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, login, register, logout, updateUser, isAuthenticated: Boolean(user) }),
    [user, updateUser]
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
