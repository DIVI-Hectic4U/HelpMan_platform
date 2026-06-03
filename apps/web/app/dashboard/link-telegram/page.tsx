"use client";
import { useState, useEffect } from "react";

export default function LinkTelegramPage() {
  const [user, setUser] = useState<any>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [step, setStep] = useState<"link" | "done">("link");
  const [pushStatus, setPushStatus] = useState<"idle" | "subscribed" | "denied" | "unsupported">("idle");

  useEffect(() => {
    const stored = localStorage.getItem("helpman_user");
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);

      if (u.telegramLinked) setStep("done");

      // Generate deep link token
      const token = `${u.id}:${Date.now()}`;
      const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "LetCFs_bot"; 
      setLinkUrl(`https://t.me/${botName}?start=${token}`);
    }

    // Check push notification support
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPushStatus("unsupported");
    } else if (Notification.permission === "granted") {
      setPushStatus("subscribed");
    } else if (Notification.permission === "denied") {
      setPushStatus("denied");
    }
  }, []);

  async function handleEnablePush() {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setPushStatus("subscribed");
        // In production, register service worker and subscribe to push
        // For now, just update status
      } else {
        setPushStatus("denied");
      }
    } catch {
      setPushStatus("denied");
    }
  }

  async function handleCheckLinked() {
    try {
      const token = localStorage.getItem("helpman_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const res = await fetch(`${apiUrl}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.telegramLinked) {
          setStep("done");
          localStorage.setItem("helpman_user", JSON.stringify(data));
        }
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="page-container" style={{ maxWidth: 650 }}>
      <div className="page-header">
        <h1>🔗 Notifications</h1>
        <p>Connect Telegram and enable push notifications</p>
      </div>

      {/* ── Telegram Section ──────────────────────── */}
      <div className="glass-card" style={{ padding: "var(--space-8)", marginBottom: "var(--space-6)" }}>
        {step === "link" ? (
          <>
            <div style={{ textAlign: "center", marginBottom: "var(--space-6)" }}>
              <span style={{ fontSize: "3rem", display: "block", marginBottom: "var(--space-3)" }}>🤖</span>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Link Telegram Bot</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "var(--space-2)" }}>
                Get daily AI-curated tasks delivered via Telegram. Free, instant, no verification needed.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {/* Step 1 */}
              <div className="gradient-card" style={{ padding: "var(--space-5)" }}>
                <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
                  <span style={{
                    background: "var(--gradient-accent)", borderRadius: "50%",
                    width: 32, height: 32, display: "flex", alignItems: "center",
                    justifyContent: "center", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0,
                  }}>1</span>
                  <div>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 600 }}>Click the button below</h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                      It opens Telegram and starts a chat with our bot
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="gradient-card" style={{ padding: "var(--space-5)" }}>
                <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
                  <span style={{
                    background: "var(--gradient-accent)", borderRadius: "50%",
                    width: 32, height: 32, display: "flex", alignItems: "center",
                    justifyContent: "center", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0,
                  }}>2</span>
                  <div>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 600 }}>Press &quot;Start&quot; in Telegram</h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                      The bot will automatically link to your HelpMan account
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="gradient-card" style={{ padding: "var(--space-5)" }}>
                <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
                  <span style={{
                    background: "var(--gradient-accent)", borderRadius: "50%",
                    width: 32, height: 32, display: "flex", alignItems: "center",
                    justifyContent: "center", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0,
                  }}>3</span>
                  <div>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 600 }}>Click &quot;I&apos;ve linked it&quot; below</h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                      We&apos;ll verify the connection
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-6)" }}>
              <a
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-lg"
                style={{ width: "100%", textAlign: "center" }}
              >
                🤖 Open in Telegram →
              </a>
              <button
                className="btn btn-secondary btn-lg"
                onClick={handleCheckLinked}
                style={{ width: "100%" }}
              >
                ✅ I&apos;ve linked it — Verify
              </button>
            </div>
          </>
        ) : (
          /* ── Linked State ─────────────────────────── */
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: "4rem", display: "block", marginBottom: "var(--space-4)" }}>✅</span>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "var(--space-3)" }}>
              Telegram Linked!
            </h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-6)" }}>
              Your Telegram is connected. Start using these commands:
            </p>

            <div className="gradient-card" style={{ padding: "var(--space-5)", textAlign: "left" }}>
              <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "var(--space-3)" }}>
                📖 Bot Commands
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", fontSize: "0.85rem" }}>
                <div><code style={{ color: "var(--accent-light)" }}>/daily</code> — Get today&apos;s problems</div>
                <div><code style={{ color: "var(--accent-light)" }}>/status</code> — View XP, streak, rank</div>
                <div><code style={{ color: "var(--accent-light)" }}>/done &lt;n&gt;</code> — Mark problem as solved</div>
                <div><code style={{ color: "var(--accent-light)" }}>/leaderboard</code> — Top 10 users</div>
                <div><code style={{ color: "var(--accent-light)" }}>/profile</code> — Your linked accounts</div>
                <div><code style={{ color: "var(--accent-light)" }}>/help</code> — All commands</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Web Push Section ──────────────────────── */}
      <div className="glass-card" style={{ padding: "var(--space-8)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-5)" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>🔔 Browser Notifications</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "var(--space-1)" }}>
              Get push notifications for daily tasks and rank-ups
            </p>
          </div>

          {pushStatus === "subscribed" && (
            <span className="badge badge-master" style={{ padding: "4px 12px" }}>Active ✓</span>
          )}
        </div>

        {pushStatus === "unsupported" && (
          <div className="alert alert-warning">
            ⚠️ Your browser doesn&apos;t support push notifications. Use Telegram instead.
          </div>
        )}

        {pushStatus === "denied" && (
          <div className="alert alert-error">
            ❌ Notifications are blocked. Enable them in your browser settings.
          </div>
        )}

        {pushStatus === "idle" && (
          <button className="btn btn-secondary btn-lg" onClick={handleEnablePush} style={{ width: "100%" }}>
            🔔 Enable Push Notifications
          </button>
        )}

        {pushStatus === "subscribed" && (
          <div className="alert alert-success">
            ✅ Push notifications are enabled! You&apos;ll be notified of daily tasks and achievements.
          </div>
        )}
      </div>
    </div>
  );
}
