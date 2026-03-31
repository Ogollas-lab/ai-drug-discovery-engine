import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api-client";
import { Activity, Users, DollarSign, Database, ShieldAlert } from "lucide-react";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { Button } from "@/components/ui/button";

interface AdminStats {
  totalUsers: number;
  paidUsers: number;
  totalSimulations: number;
  mrr: string;
}

interface UserRecord {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  subscription: {
    tier: string;
    status: string;
  };
  usageMetrics: {
    totalSimulationsAllTime: number;
  };
  createdAt: string;
}

const AdminDashboard = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    // Only attempt fetch if user is fully loaded and is an admin
    if (user && user.role === "admin") {
      fetchData();
    } else {
      setIsFetching(false);
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        apiClient.get("/api/admin/stats"),
        apiClient.get("/api/admin/users?limit=50"),
      ]);
      setStats(statsRes.data.stats);
      setUsersList(usersRes.data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleTierChange = async (userId: string, newTier: string) => {
    try {
      await apiClient.put(`/api/admin/users/${userId}/tier`, { tier: newTier });
      // Update local state instead of hard refresh to feel snappy
      setUsersList(usersList.map(u => 
        u._id === userId 
          ? { ...u, subscription: { ...u.subscription, tier: newTier } } 
          : u
      ));
    } catch (err) {
      console.error("Failed to update tier", err);
      alert("Failed to change tier. Check console.");
    }
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center">Loading Admin Tools...</div>;

  if (!isAuthenticated || (user && user.role !== "admin")) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-display font-semibold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">You must have Administrator privileges to view this page.</p>
        <Button onClick={() => window.location.href = "/"}>Return Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-[1400px] mx-auto px-4 py-20 w-full animate-in fade-in duration-500">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold">Admin Mission Control</h1>
            <p className="text-muted-foreground text-sm mt-1">Platform Telemetry & User Oversight</p>
          </div>
        </div>

        {/* STATS STRIP */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-panel p-5 rounded-xl border border-border flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg text-primary"><Users size={24} /></div>
            <div>
              <p className="text-xs text-muted-foreground font-mono">Total Users</p>
              <h3 className="text-2xl font-bold font-display">{isFetching ? "..." : stats?.totalUsers}</h3>
            </div>
          </div>
          <div className="glass-panel p-5 rounded-xl border border-border flex items-center gap-4">
            <div className="p-3 bg-neon-cyan/10 rounded-lg text-neon-cyan"><Database size={24} /></div>
            <div>
              <p className="text-xs text-muted-foreground font-mono">Paid Subscriptions</p>
              <h3 className="text-2xl font-bold font-display">{isFetching ? "..." : stats?.paidUsers}</h3>
            </div>
          </div>
          <div className="glass-panel p-5 rounded-xl border border-border flex items-center gap-4">
            <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-500"><Activity size={24} /></div>
            <div>
              <p className="text-xs text-muted-foreground font-mono">Total Simulations</p>
              <h3 className="text-2xl font-bold font-display">{isFetching ? "..." : stats?.totalSimulations}</h3>
            </div>
          </div>
          <div className="glass-panel p-5 rounded-xl border border-border flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-lg text-green-500"><DollarSign size={24} /></div>
            <div>
              <p className="text-xs text-muted-foreground font-mono">Monthly Recurring Rev</p>
              <h3 className="text-2xl font-bold font-display">{isFetching ? "..." : `$${stats?.mrr || "0.00"}`}</h3>
            </div>
          </div>
        </div>

        {/* USERS TABLE */}
        <div className="glass-panel rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border bg-secondary/30">
            <h2 className="font-semibold font-display">Recent Signups</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-secondary/50 uppercase font-mono border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Platform User</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium">SaaS Tier</th>
                  <th className="px-6 py-4 font-medium">Simulations</th>
                  <th className="px-6 py-4 font-medium">Joined Date</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isFetching ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading roster...</td></tr>
                ) : usersList.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No users found on platform.</td></tr>
                ) : (
                  usersList.map((u) => (
                    <tr key={u._id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{u.firstName} {u.lastName}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-mono ${u.role === 'admin' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          className="bg-background border border-border text-xs rounded px-2 py-1 outline-none focus:border-primary cursor-pointer"
                          value={u.subscription.tier}
                          onChange={(e) => handleTierChange(u._id, e.target.value)}
                        >
                          <option value="free">Free</option>
                          <option value="pro">Pro ($9.99)</option>
                          <option value="university">University ($299.99)</option>
                          <option value="enterprise">Enterprise ($499.99)</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 font-mono">{u.usageMetrics.totalSimulationsAllTime || 0}</td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" className="text-xs h-7">View Details</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <FooterSection />
    </div>
  );
};

export default AdminDashboard;
