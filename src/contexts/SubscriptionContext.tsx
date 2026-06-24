import React, { createContext, useContext, ReactNode } from 'react';

/** Subscription removed with MongoDB — engine is usage-based on Neon. */
interface SubscriptionContextType {
  subscription: null;
  limits: null;
  loading: false;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscription: null,
  limits: null,
  loading: false,
  refreshSubscription: async () => {},
});

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => (
  <SubscriptionContext.Provider value={{
    subscription: null,
    limits: null,
    loading: false,
    refreshSubscription: async () => {},
  }}>
    {children}
  </SubscriptionContext.Provider>
);

export const useSubscription = () => useContext(SubscriptionContext);
