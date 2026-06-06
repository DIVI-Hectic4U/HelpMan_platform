"use client";
import { useState, useEffect } from "react";

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadAdminData();
  }, []);

  async function loadAdminData() {
    try {
      const token = localStorage.getItem("helpman_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

      const [statsRes, usersRes] = await Promise.all([
        fetch(`${apiUrl}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiUrl}/admin/users?limit=50`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: 400 }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 1000 }}>
      <div className="page-header">
        <h1>🛡️ Admin Panel</h1>
        <p>System overview and user management</p>
      </div>

      {/* ── Stats Grid ────────────────────────────────── */}
      {stats && (
        <div className="grid-4" style={{ marginBottom: "var(--space-8)" }}>
          <div className="glass-card stat-card">
            <span className="stat-icon">👥</span>
            <span className="stat-value">{stats.totalUsers}</span>
            <span className="stat-label">Total Users</span>
          </div>

          <div className="glass-card stat-card">
            <span className="stat-icon">🟢</span>
            <span className="stat-value">{stats.activeToday}</span>
            <span className="stat-label">Active Today</span>
          </div>

          <div className="glass-card stat-card">
            <span className="stat-icon">📝</span>
            <span className="stat-value">{stats.completionRate}%</span>
            <span className="stat-label">Task Completion</span>
          </div>

          <div className="glass-card stat-card">
            <span className="stat-icon">⭐</span>
            <span className="stat-value">{stats.avgXp}</span>
            <span className="stat-label">Avg XP</span>
          </div>
        </div>
      )}

      {/* ── Rank Distribution ─────────────────────────── */}
      {stats?.rankDistribution && (
        <div className="glass-card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-8)" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "var(--space-5)" }}>
            📊 Rank Distribution
          </h2>
          <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
            {stats.rankDistribution.map((r: any) => (
              <div key={r.rank} style={{
                display: "flex", alignItems: "center", gap: "var(--space-2)",
                padding: "var(--space-2) var(--space-4)",
                background: "var(--bg-elevated)",
                borderRadius: "var(--radius-md)",
              }}>
                <span className={`badge badge-${r.rank.toLowerCase()}`}>{r.rank}</span>
                <span style={{ fontWeight: 700 }}>{r._count.rank}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── User Management ───────────────────────────── */}
      <div className="glass-card" style={{ padding: "var(--space-6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-5)" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>👥 Users</h2>
          <input
            type="text"
            className="input"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 250 }}
          />
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Rank</th>
                <th>XP</th>
                <th>Streak</th>
                <th>WhatsApp</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div>
                      <div style={{ fontWeight: 600 }}>{u.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{u.email}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${u.rank.toLowerCase()}`}>{u.rank}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{u.currentXp.toLocaleString()}</td>
                  <td>🔥 {u.currentStreak}</td>
                  <td>{u.whatsappLinked ? "✅" : "❌"}</td>
                  <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-muted)" }}>
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
