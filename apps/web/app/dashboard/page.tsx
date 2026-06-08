"use client";
import { useState, useEffect } from "react";

const RANK_EMOJIS: Record<string, string> = {
  BRONZE: "🥉", SILVER: "🥈", GOLD: "🥇", PLATINUM: "💎", MASTER: "👑",
};

const RANK_THRESHOLDS: Record<string, number> = {
  BRONZE: 0, SILVER: 500, GOLD: 2000, PLATINUM: 5000, MASTER: 15000,
};

const RANK_ORDER = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "MASTER"];

function getProgress(xp: number, rank: string) {
  const idx = RANK_ORDER.indexOf(rank);
  if (idx === RANK_ORDER.length - 1) return 100;
  const current = RANK_THRESHOLDS[rank];
  const next = RANK_THRESHOLDS[RANK_ORDER[idx + 1]];
  return Math.min(((xp - current) / (next - current)) * 100, 100);
}

function getNextRankXp(xp: number, rank: string) {
  const idx = RANK_ORDER.indexOf(rank);
  if (idx === RANK_ORDER.length - 1) return 0;
  return RANK_THRESHOLDS[RANK_ORDER[idx + 1]] - xp;
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("helpman_user");
    if (stored) setUser(JSON.parse(stored));
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      const token = localStorage.getItem("helpman_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

      // Fetch user profile
      const profileRes = await fetch(`${apiUrl}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setUser(profileData);
        localStorage.setItem("helpman_user", JSON.stringify(profileData));
      }

      // Fetch today's tasks
      const tasksRes = await fetch(`${apiUrl}/tasks/today`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function generateTasks() {
    setGenerating(true);
    try {
      const token = localStorage.getItem("helpman_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const res = await fetch(`${apiUrl}/tasks/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.task);
        loadDashboardData(); // Refresh stats
      }
    } catch (err) {
      console.error("Failed to generate tasks:", err);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: 400 }}>
        <div className="spinner" />
      </div>
    );
  }

  const rank = user?.rank || "BRONZE";
  const xp = user?.currentXp || 0;
  const streak = user?.currentStreak || 0;
  const progress = getProgress(xp, rank);
  const xpToNext = getNextRankXp(xp, rank);
  const nextRank = RANK_ORDER[RANK_ORDER.indexOf(rank) + 1];

  return (
    <div className="page-container" style={{ maxWidth: 1000 }}>
      {/* ── Header ───────────────────────────────────── */}
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome back, {user?.name || "User"}! Let&apos;s keep grinding. 💪</p>
      </div>

      {/* ── Stats Row ────────────────────────────────── */}
      <div className="grid-4" style={{ marginBottom: "var(--space-8)" }}>
        <div className="glass-card stat-card">
          <span className="stat-icon">{RANK_EMOJIS[rank]}</span>
          <span className="stat-value" style={{ color: "var(--accent-light)" }}>{rank}</span>
          <span className="stat-label">Current Rank</span>
        </div>

        <div className="glass-card stat-card">
          <span className="stat-icon">⭐</span>
          <span className="stat-value">{xp.toLocaleString()}</span>
          <span className="stat-label">Total XP</span>
        </div>

        <div className="glass-card stat-card">
          <span className="stat-icon">🔥</span>
          <span className="stat-value">{streak}</span>
          <span className="stat-label">Day Streak</span>
        </div>

        <div className="glass-card stat-card">
          <span className="stat-icon">🏆</span>
          <span className="stat-value">{user?.longestStreak || 0}</span>
          <span className="stat-label">Best Streak</span>
        </div>
      </div>

      {/* ── Rank Progress ────────────────────────────── */}
      <div className="glass-card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-8)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
          <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>
            {RANK_EMOJIS[rank]} {rank} → {nextRank ? `${RANK_EMOJIS[nextRank]} ${nextRank}` : "MAX RANK 🎉"}
          </span>
          <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            {xpToNext > 0 ? `${xpToNext.toLocaleString()} XP needed` : "Maximum rank!"}
          </span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* ── Today's Tasks ────────────────────────────── */}
      <div className="glass-card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-8)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-5)" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>📝 Today&apos;s Tasks</h2>
          {!tasks && (
            <button
              className="btn btn-primary"
              onClick={generateTasks}
              disabled={generating}
            >
              {generating ? "⏳ Generating..." : "🤖 Generate Tasks"}
            </button>
          )}
        </div>

        {tasks ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {(Array.isArray(tasks.problems) ? tasks.problems : []).map((problem: any, i: number) => (
              <div
                key={i}
                className="gradient-card"
                style={{
                  padding: "var(--space-5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "var(--space-4)",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <span style={{ fontSize: "1.5rem" }}>
                    {problem.platform === "leetcode" ? "🟡" : "🔵"}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600 }}>{problem.title}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      {problem.topic} • Difficulty: {problem.difficulty} • {problem.platform}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <span className="badge badge-master">⚡ {problem.xpValue} XP</span>
                  <a
                    href={problem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                  >
                    Solve →
                  </a>
                </div>
              </div>
            ))}

            {tasks.status === "COMPLETED" && (
              <div className="alert alert-success">
                ✅ All tasks completed! Great work today!
              </div>
            )}
          </div>
        ) : (
          <div style={{
            textAlign: "center",
            padding: "var(--space-10)",
            color: "var(--text-secondary)",
          }}>
            <p style={{ fontSize: "2rem", marginBottom: "var(--space-3)" }}>🤖</p>
            <p>No tasks generated yet today.</p>
            <p style={{ fontSize: "0.85rem", marginTop: "var(--space-2)" }}>
              Click &quot;Generate Tasks&quot; or send <code style={{ color: "var(--accent-light)" }}>/daily</code> on Telegram
            </p>
          </div>
        )}
      </div>

      {/* ── Quick Links ──────────────────────────────── */}
      <div className="grid-3">
        <div className="glass-card" style={{ padding: "var(--space-5)", textAlign: "center" }}>
          <span style={{ fontSize: "1.5rem" }}>📊</span>
          <h3 style={{ fontSize: "0.9rem", margin: "var(--space-2) 0" }}>
            {user?.leetcodeHandle || "Not Linked"}
          </h3>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>LeetCode</p>
        </div>

        <div className="glass-card" style={{ padding: "var(--space-5)", textAlign: "center" }}>
          <span style={{ fontSize: "1.5rem" }}>🏅</span>
          <h3 style={{ fontSize: "0.9rem", margin: "var(--space-2) 0" }}>
            {user?.codeforcesHandle || "Not Linked"}
          </h3>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Codeforces</p>
        </div>

        <div className="glass-card" style={{ padding: "var(--space-5)", textAlign: "center" }}>
          <span style={{ fontSize: "1.5rem" }}>🤖</span>
          <h3 style={{ fontSize: "0.9rem", margin: "var(--space-2) 0" }}>
            {user?.telegramLinked ? "Connected ✅" : "Not Linked"}
          </h3>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Telegram</p>
        </div>
      </div>
    </div>
  );
}
