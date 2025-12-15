import { createContext, useContext, useMemo, useState } from 'react';
import { STATIC_LOGIN } from '../api/endpoints';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem('isAuthenticated') === 'true',
  );
  const [userEmail, setUserEmail] = useState(() => sessionStorage.getItem('userEmail') || '');

  const login = (email, password) => {
    if (email === STATIC_LOGIN.email && password === STATIC_LOGIN.password) {
      setIsAuthenticated(true);
      setUserEmail(email);
      sessionStorage.setItem('isAuthenticated', 'true');
      sessionStorage.setItem('userEmail', email);
      return { ok: true };
    }

    return { ok: false, message: 'Email or password is incorrect.' };
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserEmail('');
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('userEmail');
  };

  const value = useMemo(
    () => ({
      isAuthenticated,
      userEmail,
      login,
      logout,
    }),
    [isAuthenticated, userEmail],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}

















