import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { apiClient } from '@/lib/api-client';

export interface Subscription {
  tier: 'free' | 'pro' | 'university' | 'enterprise';
  status: 'active' | 'inactive' | 'suspended' | 'cancelled';
  renewalDate?: string;
}

export interface UsageLimits {
  dailyAnaylsesLimit: number;
  analysesUsedToday: number;
  totalAnalysesUsed?: number;
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  limits: UsageLimits | null;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [limits, setLimits] = useState<UsageLimits | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = async () => {
    if (!isAuthenticated) {
      setSubscription(null);
      setLimits(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data } = await apiClient.get('/api/subscription/current');
      
      // Based on the subscription schema in User model
      setSubscription(data.subscription || null);
      setLimits(data.limits || data.usageMetrics || null);
    } catch (error) {
      console.error('Failed to sync subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [user, isAuthenticated]);

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      limits,
      loading,
      refreshSubscription: fetchSubscription
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
