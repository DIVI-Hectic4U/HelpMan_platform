"use client";
import { useState, useEffect } from "react";

export default function LinkWhatsAppPage() {
  const [user, setUser] = useState<any>(null);
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"input" | "verify" | "done">("input");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("helpman_user");
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      if (u.whatsappLinked) setStep("done");
    }
  }, []);

  function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validate phone
    const cleaned = phone.replace(/\s/g, "");
    if (!/^\+?[1-9]\d{7,14}$/.test(cleaned)) {
      setError("Invalid phone number. Include country code (e.g., +919876543210)");
      return;
    }

    // Generate a mock OTP (in production, this would be sent via WhatsApp template)
    const mockOtp = String(Math.floor(100000 + Math.random() * 900000));
    setGeneratedOtp(mockOtp);
    setStep("verify");
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Mock verification
    if (otp !== generatedOtp) {
      setError("Invalid OTP. Please try again.");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("helpman_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

      // In a real app, this would verify with backend
      const res = await fetch(`${apiUrl}/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ whatsappNumber: phone }),
      });

      if (res.ok) {
        const updated = { ...user, whatsappLinked: true, whatsappNumber: phone };
        localStorage.setItem("helpman_user", JSON.stringify(updated));
        setUser(updated);
        setStep("done");
      } else {
        setError("Failed to link WhatsApp. Please try again.");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  function handleUnlink() {
    setStep("input");
    setPhone("");
    setOtp("");
    setError("");
    setGeneratedOtp("");
  }

  return (
    <div className="page-container" style={{ maxWidth: 600 }}>
      <div className="page-header">
        <h1>📱 WhatsApp Integration</h1>
        <p>Link your WhatsApp to receive daily tasks directly</p>
      </div>

      {/* ── Step: Input Phone ──────────────────────── */}
      {step === "input" && (
        <div className="glass-card" style={{ padding: "var(--space-8)" }}>
          <div style={{ textAlign: "center", marginBottom: "var(--space-6)" }}>
            <span style={{ fontSize: "3rem", display: "block", marginBottom: "var(--space-3)" }}>📲</span>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Link Your WhatsApp</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "var(--space-2)" }}>
              Enter your WhatsApp number to receive daily AI-curated coding tasks
            </p>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: "var(--space-4)" }}>{error}</div>}

          <form onSubmit={handleSendOtp}>
            <div className="input-group" style={{ marginBottom: "var(--space-5)" }}>
              <label htmlFor="phone">WhatsApp Number</label>
              <input
                id="phone"
                type="tel"
                className="input"
                placeholder="+919876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Include country code (e.g., +91 for India)
              </span>
            </div>

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }}>
              Send Verification OTP →
            </button>
          </form>
        </div>
      )}

      {/* ── Step: Verify OTP ───────────────────────── */}
      {step === "verify" && (
        <div className="glass-card" style={{ padding: "var(--space-8)" }}>
          <div style={{ textAlign: "center", marginBottom: "var(--space-6)" }}>
            <span style={{ fontSize: "3rem", display: "block", marginBottom: "var(--space-3)" }}>🔐</span>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Verify OTP</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "var(--space-2)" }}>
              We&apos;ve sent a 6-digit code to {phone}
            </p>
          </div>

          {/* Dev hint */}
          <div className="alert alert-warning" style={{ marginBottom: "var(--space-4)" }}>
            🔧 Dev Mode: Your OTP is <strong>{generatedOtp}</strong>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: "var(--space-4)" }}>{error}</div>}

          <form onSubmit={handleVerifyOtp}>
            <div className="input-group" style={{ marginBottom: "var(--space-5)" }}>
              <label htmlFor="otp">6-Digit OTP</label>
              <input
                id="otp"
                type="text"
                className="input"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                required
                style={{ textAlign: "center", fontSize: "1.5rem", letterSpacing: "8px" }}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}
              style={{ width: "100%", marginBottom: "var(--space-3)" }}>
              {loading ? "Verifying..." : "Verify & Link ✅"}
            </button>

            <button type="button" className="btn btn-secondary" onClick={() => setStep("input")}
              style={{ width: "100%" }}>
              ← Change Number
            </button>
          </form>
        </div>
      )}

      {/* ── Step: Done ─────────────────────────────── */}
      {step === "done" && (
        <div className="glass-card" style={{ padding: "var(--space-8)", textAlign: "center" }}>
          <span style={{ fontSize: "4rem", display: "block", marginBottom: "var(--space-4)" }}>✅</span>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "var(--space-3)" }}>
            WhatsApp Linked!
          </h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-6)" }}>
            Your WhatsApp is connected. You can now receive daily tasks by sending commands.
          </p>

          <div className="gradient-card" style={{ padding: "var(--space-5)", textAlign: "left", marginBottom: "var(--space-6)" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "var(--space-3)" }}>
              📖 Available Commands
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", fontSize: "0.85rem" }}>
              <div><code style={{ color: "var(--accent-light)" }}>!daily</code> — Get today&apos;s problems</div>
              <div><code style={{ color: "var(--accent-light)" }}>!status</code> — View XP, streak, rank</div>
              <div><code style={{ color: "var(--accent-light)" }}>!done &lt;n&gt;</code> — Mark problem as solved</div>
              <div><code style={{ color: "var(--accent-light)" }}>!leaderboard</code> — Top 10 users</div>
              <div><code style={{ color: "var(--accent-light)" }}>!profile</code> — Your linked accounts</div>
              <div><code style={{ color: "var(--accent-light)" }}>!help</code> — All commands</div>
            </div>
          </div>

          <button className="btn btn-secondary" onClick={handleUnlink}>
            Unlink WhatsApp
          </button>
        </div>
      )}
    </div>
  );
}
