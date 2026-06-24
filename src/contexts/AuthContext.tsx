import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  loginAsGuest: () => void;
  loginWithToken: (token: string, userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GUEST_USER: User = {
  id: 'guest',
  name: 'Guest Researcher',
  email: 'guest@vitalis.local',
  role: 'guest',
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const guest = localStorage.getItem('guest_mode') === 'true';
    if (token) {
      setUser({ id: 'oauth', name: 'Signed in', email: 'user@neon.auth', role: 'researcher' });
    } else if (guest) {
      setUser(GUEST_USER);
    }
    setLoading(false);
  }, []);

  const loginAsGuest = () => {
    localStorage.setItem('guest_mode', 'true');
    localStorage.removeItem('token');
    setUser(GUEST_USER);
  };

  const loginWithToken = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    localStorage.removeItem('guest_mode');
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('guest_mode');
    localStorage.removeItem('auth_provider');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      loading,
      loginAsGuest,
      loginWithToken,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
