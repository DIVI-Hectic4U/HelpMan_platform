"use client";
import { useState, useEffect } from "react";

const RANK_EMOJIS: Record<string, string> = {
  BRONZE: "🥉", SILVER: "🥈", GOLD: "🥇", PLATINUM: "💎", MASTER: "👑",
};

interface LeaderboardUser {
  position: number;
  id: string;
  name: string;
  currentXp: number;
  rank: string;
  currentStreak: number;
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    const stored = localStorage.getItem("helpman_user");
    if (stored) {
      const user = JSON.parse(stored);
      setCurrentUserId(user.id);
    }
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const res = await fetch(`${apiUrl}/gamification/leaderboard?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    } finally {
      setLoading(false);
    }
  }

  const getMedal = (pos: number) => {
    if (pos === 1) return "🥇";
    if (pos === 2) return "🥈";
    if (pos === 3) return "🥉";
    return `#${pos}`;
  };

  return (
    <div className="page-container" style={{ maxWidth: 800 }}>
      <div className="page-header">
        <h1>🏆 Leaderboard</h1>
        <p>Top performers this season</p>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner" /></div>
      ) : users.length === 0 ? (
        <div className="glass-card" style={{ padding: "var(--space-10)", textAlign: "center" }}>
          <p style={{ fontSize: "2rem", marginBottom: "var(--space-3)" }}>🏜️</p>
          <p style={{ color: "var(--text-secondary)" }}>No users on the leaderboard yet. Be the first!</p>
        </div>
      ) : (
        <>
          {/* ── Top 3 Podium ──────────────────────────── */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: "var(--space-5)",
            marginBottom: "var(--space-8)",
            alignItems: "flex-end",
          }}>
            {[1, 0, 2].map((idx) => {
              const user = users[idx];
              if (!user) return null;
              const isFirst = idx === 0;
              return (
                <div
                  key={user.id}
                  className="glass-card"
                  style={{
                    padding: "var(--space-6) var(--space-5)",
                    textAlign: "center",
                    width: isFirst ? 200 : 160,
                    transform: isFirst ? "scale(1.1)" : "none",
                    border: user.id === currentUserId ? "1px solid var(--accent)" : undefined,
                    boxShadow: isFirst ? "var(--shadow-glow-lg)" : undefined,
                  }}
                >
                  <div style={{ fontSize: "2.5rem", marginBottom: "var(--space-2)" }}>
                    {getMedal(user.position)}
                  </div>
                  <div style={{
                    width: isFirst ? 56 : 44,
                    height: isFirst ? 56 : 44,
                    borderRadius: "50%",
                    background: "var(--gradient-accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: isFirst ? "1.2rem" : "1rem",
                    margin: "0 auto var(--space-3)",
                  }}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{user.name}</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--accent-light)", margin: "var(--space-2) 0" }}>
                    {user.currentXp.toLocaleString()} XP
                  </div>
                  <span className={`badge badge-${user.rank.toLowerCase()}`}>
                    {RANK_EMOJIS[user.rank]} {user.rank}
                  </span>
                </div>
              );
            })}
          </div>

          {/* ── Full Table ────────────────────────────── */}
          <div className="table-container glass-card">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>User</th>
                  <th>Rank</th>
                  <th>XP</th>
                  <th>Streak</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    style={{
                      background: user.id === currentUserId ? "rgba(124, 58, 237, 0.08)" : undefined,
                    }}
                  >
                    <td style={{ fontWeight: 700, width: 50 }}>
                      {getMedal(user.position)}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%",
                          background: "var(--gradient-accent)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 600, fontSize: "0.75rem",
                        }}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600 }}>
                          {user.name}
                          {user.id === currentUserId && (
                            <span style={{ fontSize: "0.7rem", color: "var(--accent-light)", marginLeft: "var(--space-2)" }}>
                              (You)
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${user.rank.toLowerCase()}`}>
                        {RANK_EMOJIS[user.rank]} {user.rank}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{user.currentXp.toLocaleString()}</td>
                    <td>🔥 {user.currentStreak}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
