"use client";
import { useState, useEffect } from "react";

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [leetcode, setLeetcode] = useState("");
  const [codeforces, setCodeforces] = useState("");
  const [difficulty, setDifficulty] = useState("adaptive");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [notifications, setNotifications] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const token = localStorage.getItem("helpman_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const res = await fetch(`${apiUrl}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setName(data.name || "");
        setLeetcode(data.leetcodeHandle || "");
        setCodeforces(data.codeforcesHandle || "");
        setDifficulty(data.preferences?.difficultyPref || "adaptive");
        setTimezone(data.preferences?.timezone || "Asia/Kolkata");
        setNotifications(data.preferences?.notificationsOn ?? true);
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const token = localStorage.getItem("helpman_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

      // Update profile
      const profileRes = await fetch(`${apiUrl}/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          leetcodeHandle: leetcode || null,
          codeforcesHandle: codeforces || null,
        }),
      });

      // Update preferences
      const prefsRes = await fetch(`${apiUrl}/users/me/preferences`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          difficultyPref: difficulty,
          timezone,
          notificationsOn: notifications,
          dailyReminderAt: "08:00",
        }),
      });

      if (profileRes.ok && prefsRes.ok) {
        const updatedProfile = await profileRes.json();
        localStorage.setItem("helpman_user", JSON.stringify({ ...user, ...updatedProfile }));
        setMessage({ type: "success", text: "Settings saved successfully! ✅" });
      } else {
        const err = await profileRes.json();
        setMessage({ type: "error", text: err.error || "Failed to save settings" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (!confirm("Are you sure? This action is irreversible.")) return;

    try {
      const token = localStorage.getItem("helpman_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const res = await fetch(`${apiUrl}/users/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        localStorage.clear();
        window.location.href = "/";
      }
    } catch {
      setMessage({ type: "error", text: "Failed to delete account" });
    }
  }

  return (
    <div className="page-container" style={{ maxWidth: 700 }}>
      <div className="page-header">
        <h1>⚙️ Settings</h1>
        <p>Manage your profile, linked accounts, and preferences</p>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: "var(--space-6)" }}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSaveProfile}>
        {/* ── Profile Section ────────────────────────── */}
        <div className="glass-card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-6)" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "var(--space-5)" }}>
            👤 Profile
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <div className="input-group">
              <label htmlFor="name">Display Name</label>
              <input id="name" type="text" className="input" value={name}
                onChange={(e) => setName(e.target.value)} required minLength={2} />
            </div>

            <div className="input-group">
              <label>Email</label>
              <input type="email" className="input" value={user?.email || ""} disabled
                style={{ opacity: 0.5, cursor: "not-allowed" }} />
            </div>
          </div>
        </div>

        {/* ── Linked Accounts ────────────────────────── */}
        <div className="glass-card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-6)" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "var(--space-5)" }}>
            🔗 Linked Accounts
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <div className="input-group">
              <label htmlFor="leetcode">🟡 LeetCode Handle</label>
              <input id="leetcode" type="text" className="input"
                placeholder="your-leetcode-username" value={leetcode}
                onChange={(e) => setLeetcode(e.target.value)} />
            </div>

            <div className="input-group">
              <label htmlFor="codeforces">🔵 Codeforces Handle</label>
              <input id="codeforces" type="text" className="input"
                placeholder="your-cf-handle" value={codeforces}
                onChange={(e) => setCodeforces(e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── Preferences ────────────────────────────── */}
        <div className="glass-card" style={{ padding: "var(--space-6)", marginBottom: "var(--space-6)" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "var(--space-5)" }}>
            🎯 Preferences
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <div className="input-group">
              <label htmlFor="difficulty">Difficulty Preference</label>
              <select id="difficulty" className="input" value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}>
                <option value="adaptive">🤖 Adaptive (AI decides)</option>
                <option value="easy">🟢 Easy</option>
                <option value="medium">🟡 Medium</option>
                <option value="hard">🔴 Hard</option>
              </select>
            </div>

            <div className="input-group">
              <label htmlFor="timezone">Timezone</label>
              <select id="timezone" className="input" value={timezone}
                onChange={(e) => setTimezone(e.target.value)}>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <input type="checkbox" id="notifications" checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
                style={{ accentColor: "var(--accent)" }} />
              <label htmlFor="notifications" style={{ fontSize: "0.875rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                Enable notifications
              </label>
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-lg" disabled={saving}
          style={{ width: "100%", marginBottom: "var(--space-8)" }}>
          {saving ? "Saving..." : "💾 Save Settings"}
        </button>
      </form>

      {/* ── Danger Zone ──────────────────────────────── */}
      <div className="glass-card" style={{
        padding: "var(--space-6)",
        borderColor: "rgba(239, 68, 68, 0.2)",
      }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--danger)", marginBottom: "var(--space-3)" }}>
          ⚠️ Danger Zone
        </h2>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "var(--space-4)" }}>
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>

        {!showDelete ? (
          <button className="btn btn-danger" onClick={() => setShowDelete(true)}>
            Delete Account
          </button>
        ) : (
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <button className="btn btn-danger" onClick={handleDeleteAccount}>
              Yes, Delete Everything
            </button>
            <button className="btn btn-secondary" onClick={() => setShowDelete(false)}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
