# Phase 1: Backend Integration & Data Architecture Implementation Guide

## Overview

**Goal:** Remove all hardcoded data from the frontend, establish API-driven architecture, and prepare for authentication integration.

**Timeline:** Week 1-2 (10 working days)

**Deliverables:**
- ✅ API client with auth interceptors
- ✅ All data hooks (useTargets, useDiseases, usePredictions, etc.)
- ✅ Zero hardcoded component data
- ✅ Centralized API endpoint definitions
- ✅ Error handling and loading states
- ✅ Backend API routes documented

---

## Step 1: Create API Client Layer (Day 1)

### 1.1 Create `src/lib/api-client.ts`

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor: Add auth token
    this.client.interceptors.request.use((config) => {
      const token = this.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor: Handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // If 401 and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = this.getRefreshToken();
            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refreshToken,
            });

            const { accessToken } = response.data;
            this.setAccessToken(accessToken);

            // Retry original request
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed - clear tokens and redirect to login
            this.clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Token management
  private getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  private setAccessToken(token: string): void {
    localStorage.setItem('accessToken', token);
  }

  private clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  // API methods
  public get<T>(url: string, config = {}) {
    return this.client.get<T>(url, config);
  }

  public post<T>(url: string, data?: any, config = {}) {
    return this.client.post<T>(url, data, config);
  }

  public put<T>(url: string, data?: any, config = {}) {
    return this.client.put<T>(url, data, config);
  }

  public patch<T>(url: string, data?: any, config = {}) {
    return this.client.patch<T>(url, data, config);
  }

  public delete<T>(url: string, config = {}) {
    return this.client.delete<T>(url, config);
  }
}

export const apiClient = new ApiClient();
export default apiClient;
```

### 1.2 Create `src/lib/api-endpoints.ts`

```typescript
// Centralized API endpoint definitions

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    SIGNUP: '/auth/signup',
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    VERIFY_EMAIL: '/auth/verify-email',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    PROFILE: '/auth/profile',
    LOGOUT: '/auth/logout',
  },

  // Targets
  TARGETS: {
    LIST: '/targets',
    GET: (id: string) => `/targets/${id}`,
    KNOWN_DRUGS: (id: string) => `/targets/${id}/known-drugs`,
  },

  // Diseases
  DISEASES: {
    LIST: '/diseases',
    GET: (id: string) => `/diseases/${id}`,
  },

  // Predictions
  PREDICTIONS: {
    BINDING_AFFINITY: '/predictions/binding-affinity',
    ADMET: '/predictions/admet',
    TOXICITY: '/predictions/toxicity',
    MULTI_TARGET: '/predictions/multi-target',
    BATCH: '/predictions/batch',
  },

  // Workspace
  WORKSPACE: {
    EXPERIMENTS: '/workspace/experiments',
    GET: (id: string) => `/workspace/experiments/${id}`,
    CREATE: '/workspace/experiments',
    UPDATE: (id: string) => `/workspace/experiments/${id}`,
    DELETE: (id: string) => `/workspace/experiments/${id}`,
  },

  // User
  USER: {
    QUOTA: '/user/quota',
    USAGE: '/user/usage',
    SUBSCRIPTION: '/user/subscription',
  },

  // Benchmarks
  BENCHMARKS: {
    LIST: '/benchmarks',
    MODELS: '/benchmarks/models',
  },
};
```

### 1.3 Update `.env.local`

```bash
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=Vitalis AI
VITE_APP_VERSION=2.0.0
```

---

## Step 2: Create Auth Context (Day 1-2)

### 2.1 Create Types File `src/types/auth.ts`

```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  institution?: string;
  avatar?: string;
  role: 'student' | 'researcher' | 'admin';
  team?: {
    id: string;
    name: string;
    role: 'owner' | 'member' | 'admin';
  };
  subscription: {
    tier: 'free' | 'pro' | 'university' | 'enterprise';
    status: 'active' | 'suspended' | 'expired';
    endsAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface SignupData {
  email: string;
  password: string;
  name: string;
  institution?: string;
  role: 'student' | 'researcher';
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}
```

### 2.2 Create `src/context/AuthContext.tsx`

```typescript
import React, { createContext, useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import type { User, LoginResponse, SignupData, AuthContextType } from '@/types/auth';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const accessToken = localStorage.getItem('accessToken');

    if (savedUser && accessToken) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (err) {
        console.error('Failed to parse saved user:', err);
        localStorage.removeItem('user');
      }
    }

    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const response = await apiClient.post<LoginResponse>(
        API_ENDPOINTS.AUTH.LOGIN,
        { email, password }
      );

      const { accessToken, refreshToken, user } = response.data;

      // Store tokens and user
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      setUser(user);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
      throw err;
    }
  }, []);

  const signup = useCallback(async (data: SignupData) => {
    setError(null);
    try {
      const response = await apiClient.post<LoginResponse>(
        API_ENDPOINTS.AUTH.SIGNUP,
        data
      );

      const { accessToken, refreshToken, user } = response.data;

      // Store tokens and user
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      setUser(user);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Signup failed';
      setError(message);
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    loading,
    error,
    login,
    signup,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook
export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### 2.3 Create `src/hooks/useApi.ts` (Generic API Hook)

```typescript
import { useState, useCallback, useEffect } from 'react';
import { AxiosError } from 'axios';
import { apiClient } from '@/lib/api-client';

interface UseApiOptions {
  skip?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: AxiosError) => void;
}

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: AxiosError | null;
  refetch: () => Promise<void>;
}

export const useApi = <T,>(
  url: string,
  options: UseApiOptions = {}
): UseApiState<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!options.skip);
  const [error, setError] = useState<AxiosError | null>(null);

  const fetchData = useCallback(async () => {
    if (!url) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<T>(url);
      setData(response.data);
      options.onSuccess?.(response.data);
    } catch (err) {
      const axiosError = err as AxiosError;
      setError(axiosError);
      options.onError?.(axiosError);
    } finally {
      setLoading(false);
    }
  }, [url, options]);

  useEffect(() => {
    if (!options.skip) {
      fetchData();
    }
  }, [fetchData, options.skip]);

  return { data, loading, error, refetch: fetchData };
};

// Mutation hook for POST/PUT/DELETE
export const useApiMutation = <T, R = any>(
  url: string,
  method: 'post' | 'put' | 'patch' | 'delete' = 'post'
) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AxiosError | null>(null);

  const mutate = useCallback(
    async (data?: any): Promise<R | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient[method]<R>(url, data);
        return response.data;
      } catch (err) {
        const axiosError = err as AxiosError;
        setError(axiosError);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [url, method]
  );

  return { mutate, loading, error };
};
```

---

## Step 3: Create Data Hooks (Day 2-3)

### 3.1 Create `src/hooks/useTargets.ts`

```typescript
import { useState, useEffect } from 'react';
import { useApi } from './useApi';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { apiClient } from '@/lib/api-client';

export interface TargetInfo {
  id: string;
  name: string;
  gene: string;
  mechanism: string;
  description: string;
  existingDrugs: string[];
  indications: string[];
  tags: string[];
}

export const useTargets = () => {
  return useApi<TargetInfo[]>(API_ENDPOINTS.TARGETS.LIST);
};

export const useTarget = (id: string) => {
  return useApi<TargetInfo>(API_ENDPOINTS.TARGETS.GET(id), { skip: !id });
};

export const useTargetKnownDrugs = (id: string) => {
  return useApi<string[]>(API_ENDPOINTS.TARGETS.KNOWN_DRUGS(id), { skip: !id });
};
```

### 3.2 Create `src/hooks/useDiseases.ts`

```typescript
import { useApi } from './useApi';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

export interface DiseaseInfo {
  id: string;
  name: string;
  category: string;
  targets: string[];
  description: string;
  icon: string;
}

export const useDiseases = () => {
  return useApi<DiseaseInfo[]>(API_ENDPOINTS.DISEASES.LIST);
};

export const useDisease = (id: string) => {
  return useApi<DiseaseInfo>(API_ENDPOINTS.DISEASES.GET(id), { skip: !id });
};
```

### 3.3 Create `src/hooks/usePredictions.ts`

```typescript
import { useApiMutation } from './useApi';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

export interface PredictionRequest {
  smiles: string;
  targetId: string;
  includeAdmet?: boolean;
  includeToxicity?: boolean;
}

export interface PredictionResult {
  id: string;
  smiles: string;
  name: string;
  targetId: string;
  bindingAffinity: {
    score: number;
    unit: string;
    confidence: number;
  };
  admet?: {
    mw: number;
    logp: number;
    hbd: number;
    hba: number;
    rtb: number;
    violations: number;
    drugLikeness: number;
  };
  toxicity?: {
    hepatotoxic: boolean;
    mutagenic: boolean;
    acute_toxicity: number;
    flags: string[];
  };
  createdAt: string;
}

export const useBindingAffinityPrediction = () => {
  return useApiMutation<PredictionResult>(
    API_ENDPOINTS.PREDICTIONS.BINDING_AFFINITY,
    'post'
  );
};

export const useAdmetPrediction = () => {
  return useApiMutation(API_ENDPOINTS.PREDICTIONS.ADMET, 'post');
};

export const useToxicityPrediction = () => {
  return useApiMutation(API_ENDPOINTS.PREDICTIONS.TOXICITY, 'post');
};

export const useBatchPrediction = () => {
  return useApiMutation(API_ENDPOINTS.PREDICTIONS.BATCH, 'post');
};
```

### 3.4 Create `src/hooks/useQuota.ts`

```typescript
import { useApi } from './useApi';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

export interface QuotaInfo {
  tier: string;
  dailyLimit: number;
  monthlyLimit: number;
  todayUsed: number;
  monthlyUsed: number;
  resetTime: string;
}

export const useQuota = () => {
  return useApi<QuotaInfo>(API_ENDPOINTS.USER.QUOTA);
};

export const useUsageStats = () => {
  return useApi<any>(API_ENDPOINTS.USER.USAGE);
};
```

### 3.5 Create `src/hooks/useWorkspace.ts`

```typescript
import { useApi, useApiMutation } from './useApi';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

export interface Experiment {
  id: string;
  name: string;
  description?: string;
  targetId: string;
  molecules: string[]; // SMILES
  results: any[];
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export const useWorkspaceExperiments = () => {
  return useApi<Experiment[]>(API_ENDPOINTS.WORKSPACE.EXPERIMENTS);
};

export const useWorkspaceExperiment = (id: string) => {
  return useApi<Experiment>(API_ENDPOINTS.WORKSPACE.GET(id), { skip: !id });
};

export const useCreateExperiment = () => {
  return useApiMutation(API_ENDPOINTS.WORKSPACE.CREATE, 'post');
};

export const useUpdateExperiment = (id: string) => {
  return useApiMutation(API_ENDPOINTS.WORKSPACE.UPDATE(id), 'put');
};

export const useDeleteExperiment = (id: string) => {
  return useApiMutation(API_ENDPOINTS.WORKSPACE.DELETE(id), 'delete');
};
```

---

## Step 4: Refactor Components (Day 3-4)

### 4.1 Update `src/components/FeaturesGrid.tsx`

**Before:** Hardcoded features array
**After:** Dynamic content from config or API

```typescript
import { useApi } from '@/hooks/useApi';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
  link: string;
}

const FeaturesGrid = () => {
  const { data: features, loading } = useApi<Feature[]>('/config/features');

  if (loading) return <LoadingSpinner />;

  return (
    <section className="py-20 md:py-24 px-6 relative">
      <div className="max-w-6xl mx-auto">
        {/* Grid content */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features?.map((f) => (
            <FeatureCard key={f.id} feature={f} />
          ))}
        </div>
      </div>
    </section>
  );
};
```

### 4.2 Update `src/components/workspace/TargetDiseasePanel.tsx`

**Before:** Uses hardcoded `TARGETS` and `DISEASES`
**After:** Uses hooks

```typescript
import { useTargets } from '@/hooks/useTargets';
import { useDiseases } from '@/hooks/useDiseases';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const TargetDiseasePanel = ({ onSelectTarget }: Props) => {
  const { data: targets, loading: targetsLoading } = useTargets();
  const { data: diseases, loading: diseasesLoading } = useDiseases();
  const [tab, setTab] = useState<'target' | 'disease'>('target');
  const [search, setSearch] = useState('');

  if (targetsLoading || diseasesLoading) return <LoadingSpinner />;

  const filteredTargets = targets?.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.gene.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="h-full flex flex-col">
      {/* Tab header */}
      <div className="flex border-b border-border">
        {/* Tabs code */}
      </div>

      {/* Rest of component */}
    </div>
  );
};
```

### 4.3 Update `src/components/workspace/WorkspaceAnalyzer.tsx`

**Before:** Uses mock `generateMoleculeResultReal()`
**After:** Uses `useBindingAffinityPrediction()` hook

```typescript
import { useBindingAffinityPrediction } from '@/hooks/usePredictions';
import { useQuota } from '@/hooks/useQuota';
import { toast } from '@/components/ui/use-toast';

const WorkspaceAnalyzer = ({ selectedTarget, onResult }: Props) => {
  const [smiles, setSmiles] = useState('');
  const [result, setResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const { mutate: predictAffinity, loading: predicting } = 
    useBindingAffinityPrediction();
  const { data: quota } = useQuota();

  const analyze = async () => {
    // Check quota
    if (quota && quota.todayUsed >= quota.dailyLimit) {
      toast.error('Daily quota exceeded. Upgrade your plan.');
      return;
    }

    setAnalyzing(true);
    try {
      const result = await predictAffinity({
        smiles,
        targetId: selectedTarget?.id,
        includeAdmet: true,
        includeToxicity: true,
      });

      setResult(result);
      onResult?.(result);
      toast.success('Prediction complete!');
    } catch (error) {
      toast.error('Prediction failed. Try again.');
      console.error(error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Component JSX */}
    </div>
  );
};
```

### 4.4 Update `src/components/MetricsSection.tsx`

```typescript
import { useApi } from '@/hooks/useApi';

interface Benchmark {
  dataset: string;
  task: string;
  model: string;
  metric: string;
  score: string;
}

const MetricsSection = () => {
  const { data: benchmarks, loading } = useApi<Benchmark[]>('/benchmarks');

  if (loading) return <LoadingSpinner />;

  return (
    <section className="py-20 md:py-24 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Heading */}
        <motion.div className="glass-panel rounded-2xl overflow-hidden glow-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Dataset', 'Task', 'Model', 'Metric', 'Score'].map((h) => (
                  <th key={h} className="text-left px-6 py-4 text-xs font-mono text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {benchmarks?.map((row, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-primary/5">
                  <td className="px-6 py-4 text-sm font-mono">{row.dataset}</td>
                  <td className="px-6 py-4 text-sm">{row.task}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded text-xs font-mono bg-primary/10 text-primary">
                      {row.model}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{row.metric}</td>
                  <td className="px-6 py-4 text-sm font-mono text-primary font-semibold">{row.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
};
```

---

## Step 5: Create ProtectedRoute Component (Day 4)

### 5.1 Create `src/components/ProtectedRoute.tsx`

```typescript
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredTier?: 'free' | 'pro' | 'university' | 'enterprise';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredTier,
}) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredTier && user?.subscription.tier !== requiredTier) {
    return <Navigate to="/upgrade" replace />;
  }

  return <>{children}</>;
};
```

---

## Step 6: Update App.tsx (Day 4)

### 6.1 Update `src/App.tsx`

```typescript
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Screening from "./pages/Screening";
import Workspace from "./pages/Workspace";
import Education from "./pages/Education";
import Benchmarks from "./pages/Benchmarks";
import Classroom from "./pages/Classroom";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workspace"
              element={
                <ProtectedRoute>
                  <Workspace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/screening"
              element={
                <ProtectedRoute>
                  <Screening />
                </ProtectedRoute>
              }
            />
            <Route
              path="/education"
              element={
                <ProtectedRoute>
                  <Education />
                </ProtectedRoute>
              }
            />
            <Route
              path="/benchmarks"
              element={
                <ProtectedRoute>
                  <Benchmarks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/classroom"
              element={
                <ProtectedRoute>
                  <Classroom />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
```

---

## Step 7: Create Backend API Endpoints (Day 5-6)

### 7.1 Create `backend/src/models/Target.js`

```javascript
const mongoose = require('mongoose');

const targetSchema = new mongoose.Schema({
  gene: {
    type: String,
    required: true,
    unique: true,
  },
  name: String,
  mechanism: String,
  description: String,
  existingDrugs: [String],
  indications: [String],
  tags: [String],
  proteinStructure: {
    pdbId: String,
    sequence: String,
  },
  literature: {
    pmids: [String],
    reviews: [String],
  },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Target', targetSchema);
```

### 7.2 Create `backend/src/models/Disease.js`

```javascript
const mongoose = require('mongoose');

const diseaseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  category: String,
  description: String,
  targets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Target' }],
  prevalenceAfrica: {
    estimate: Number,
    unit: String,
  },
  icon: String,
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Disease', diseaseSchema);
```

### 7.3 Create `backend/src/routes/targets.js`

```javascript
const express = require('express');
const Target = require('../models/Target');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET all targets
router.get('/', async (req, res) => {
  try {
    const targets = await Target.find().lean();
    res.json(targets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single target
router.get('/:id', async (req, res) => {
  try {
    const target = await Target.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'Target not found' });
    res.json(target);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET known drugs for target
router.get('/:id/known-drugs', async (req, res) => {
  try {
    const target = await Target.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'Target not found' });
    res.json({ drugs: target.existingDrugs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### 7.4 Create `backend/src/routes/diseases.js`

```javascript
const express = require('express');
const Disease = require('../models/Disease');

const router = express.Router();

// GET all diseases
router.get('/', async (req, res) => {
  try {
    const diseases = await Disease.find().populate('targets', 'gene name').lean();
    res.json(diseases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single disease
router.get('/:id', async (req, res) => {
  try {
    const disease = await Disease.findById(req.params.id).populate('targets');
    if (!disease) return res.status(404).json({ error: 'Disease not found' });
    res.json(disease);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### 7.5 Create `backend/src/routes/predictions.js`

```javascript
const express = require('express');
const { authenticateToken, checkUsageQuota, trackUsage } = require('../middleware/auth');

const router = express.Router();

// POST: Binding affinity prediction
router.post(
  '/binding-affinity',
  authenticateToken,
  checkUsageQuota,
  trackUsage('prediction'),
  async (req, res) => {
    const { smiles, targetId, includeAdmet, includeToxicity } = req.body;

    if (!smiles || !targetId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      // Call ML model (pseudo-code)
      // const prediction = await mlModelService.predictAffinity(smiles, targetId);
      
      // For now, return mock prediction
      const prediction = {
        id: 'pred_' + Date.now(),
        smiles,
        name: 'Compound 1',
        targetId,
        bindingAffinity: {
          score: Math.random() * 10,
          unit: 'pKd',
          confidence: 0.85,
        },
        ...(includeAdmet && {
          admet: {
            mw: 350,
            logp: 2.5,
            hbd: 2,
            hba: 5,
            rtb: 4,
            violations: 0,
            drugLikeness: 0.92,
          },
        }),
        ...(includeToxicity && {
          toxicity: {
            hepatotoxic: false,
            mutagenic: false,
            acute_toxicity: 0.1,
            flags: [],
          },
        }),
        createdAt: new Date(),
      };

      res.json(prediction);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
```

### 7.6 Update `backend/src/index.js`

```javascript
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const subscriptionRoutes = require('./routes/subscription');
const targetRoutes = require('./routes/targets');
const diseaseRoutes = require('./routes/diseases');
const predictionRoutes = require('./routes/predictions');

// Import middleware
const { authenticateToken } = require('./middleware/auth');

const app = express();

// Middleware
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vitalis')
  .then(() => console.log('✓ MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/subscription', authenticateToken, subscriptionRoutes);
app.use('/api/targets', targetRoutes);
app.use('/api/diseases', diseaseRoutes);
app.use('/api/predictions', predictionRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Vitalis AI Backend running on http://localhost:${PORT}`);
  console.log(`📊 API Documentation: http://localhost:${PORT}/api/docs`);
});
```

---

## Step 8: Remove Hardcoded Data Files (Day 6)

### 8.1 Update `src/data/targets.ts`

**BEFORE:** 367 lines of hardcoded data
**AFTER:** Delete file entirely, or keep only as backup

```bash
# Option 1: Delete completely (recommended)
rm src/data/targets.ts

# Option 2: Rename as backup
mv src/data/targets.ts src/data/targets.backup.ts
```

### 8.2 Remove Imports

Update all files that imported from `src/data/targets.ts`:

```bash
# Find files
grep -r "from.*data/targets" src/

# Update each file to use hooks instead
```

---

## Step 9: Testing & Verification (Day 7)

### 9.1 Test Checklist

```
□ API client initializes correctly
□ Auth context provides user data
□ useTargets hook fetches and returns data
□ useDiseases hook fetches and returns data
□ usePredictions hook sends prediction and gets result
□ Quota tracking works
□ Protected routes block unauthenticated access
□ Error handling shows appropriate messages
□ Loading states appear while fetching
□ No hardcoded data in components
□ Backend endpoints all respond correctly
```

### 9.2 Manual Testing

```bash
# Terminal 1: Start backend
cd backend
npm start

# Terminal 2: Start frontend
cd ai-drug-discovery-engine
npm run dev

# Browser: Test flows
1. Navigate to http://localhost:5173
2. Try to access /workspace (should redirect to /login)
3. Check Network tab - should see API calls to http://localhost:5000/api/...
4. Test data loading in components
```

---

## Quick Reference: File Summary

### Created Files (13)
```
src/lib/
  ├── api-client.ts
  ├── api-endpoints.ts

src/context/
  ├── AuthContext.tsx

src/hooks/
  ├── useApi.ts
  ├── useAuth.ts (imported from context)
  ├── useTargets.ts
  ├── useDiseases.ts
  ├── usePredictions.ts
  ├── useQuota.ts
  ├── useWorkspace.ts

src/types/
  ├── auth.ts

src/components/
  ├── ProtectedRoute.tsx

backend/src/models/
  ├── Target.js
  ├── Disease.js

backend/src/routes/
  ├── targets.js
  ├── diseases.js
  ├── predictions.js
```

### Modified Files (2)
```
src/App.tsx
  - Add AuthProvider wrapper
  - Add ProtectedRoute for all protected pages
  - Add Login/Signup routes

src/components/
  - FeaturesGrid.tsx (use API instead of hardcoded)
  - MetricsSection.tsx (use API instead of hardcoded)
  - workspace/TargetDiseasePanel.tsx (use hooks)
  - workspace/WorkspaceAnalyzer.tsx (use prediction hook)
```

### Deleted Files (1)
```
src/data/targets.ts (DELETED - all data now from API)
```

---

## Troubleshooting

### Issue: CORS errors
**Solution:** Add CORS headers to backend
```javascript
const cors = require('cors');
app.use(cors({ origin: 'http://localhost:5173' }));
```

### Issue: Token not being sent
**Solution:** Check localStorage keys match
```javascript
// Verify keys in DevTools Console
localStorage.getItem('accessToken');
localStorage.getItem('refreshToken');
```

### Issue: API calls 404
**Solution:** Verify backend routes are registered
```javascript
app.use('/api/targets', targetRoutes);  // Must exist
```

### Issue: Types not found
**Solution:** Check tsconfig includes types
```json
{
  "include": ["src/**/*", "src/**/*.ts", "src/**/*.tsx"]
}
```

---

## Next Steps After Phase 1

Once this phase is complete:

1. **Phase 2:** Create Login/Signup pages with full auth flow
2. **Phase 3:** Redesign UI with Africa-focused messaging
3. **Phase 4:** Integrate real prediction models
4. **Phase 5:** Create education/onboarding flows

---

**Phase 1 Completion Estimate:** 7 days  
**Total Lines of Code:** ~2,500 lines  
**Status:** Ready for implementation
