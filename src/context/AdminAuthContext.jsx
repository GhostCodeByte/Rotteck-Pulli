import { createContext, useContext, useMemo, useState } from "react";

const AdminAuthContext = createContext(undefined);

export function AdminAuthProvider({ children }) {
  const [token, setToken] = useState(null);

  const value = useMemo(
    () => ({
      token,
      login: (nextToken) => {
        setToken(
          typeof nextToken === "string" && nextToken.trim()
            ? nextToken.trim()
            : null
        );
      },
      logout: () => setToken(null),
    }),
    [token]
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error(
      "useAdminAuth muss innerhalb eines AdminAuthProvider verwendet werden"
    );
  }
  return context;
}
