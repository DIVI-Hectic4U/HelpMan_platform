"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";

export default function LandingPage() {
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStatsVisible(true), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={styles.landing}>
      {/* ── Ambient Background ─────────────────────────────── */}
      <div className={styles.ambientBg}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.orb3} />
        <div className={styles.gridOverlay} />
      </div>

      {/* ── Navigation ─────────────────────────────────────── */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoIcon}>⚡</span>
            <span className={styles.logoText}>HelpMan</span>
          </Link>
          <div className={styles.navLinks}>
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#ranks">Ranks</a>
            <Link href="/login" className={`btn btn-secondary ${styles.navBtn}`}>
              Log In
            </Link>
            <Link href="/register" className={`btn btn-primary ${styles.navBtn}`}>
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ───────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={`${styles.heroBadge} animate-fade-in`}>
            <span className={styles.heroBadgeDot} />
            AI-Powered Placement Prep
          </div>
          <h1 className={`${styles.heroTitle} animate-fade-in-up stagger-1`}>
            Level Up Your
            <span className={styles.heroGradient}> Coding Skills</span>
            <br />With AI & Gamification
          </h1>
          <p className={`${styles.heroSubtitle} animate-fade-in-up stagger-2`}>
            Daily AI-curated coding problems delivered straight to your WhatsApp.
            Track progress with XP, streaks, and compete on leaderboards.
            Built for placement season warriors.
          </p>
          <div className={`${styles.heroCta} animate-fade-in-up stagger-3`}>
            <Link href="/register" className="btn btn-primary btn-lg">
              🚀 Start Free
            </Link>
            <Link href="#how-it-works" className="btn btn-secondary btn-lg">
              Learn More →
            </Link>
          </div>

          {/* Live Stats */}
          <div className={`${styles.heroStats} ${statsVisible ? styles.heroStatsVisible : ""}`}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>500+</span>
              <span className={styles.heroStatLabel}>Problems Solved</span>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>50+</span>
              <span className={styles.heroStatLabel}>Active Users</span>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>98%</span>
              <span className={styles.heroStatLabel}>Placement Rate</span>
            </div>
          </div>
        </div>

        {/* Floating Code Card */}
        <div className={`${styles.heroVisual} animate-fade-in-up stagger-4`}>
          <div className={styles.codeCard}>
            <div className={styles.codeCardHeader}>
              <div className={styles.codeCardDots}>
                <span style={{ background: "#ef4444" }} />
                <span style={{ background: "#f59e0b" }} />
                <span style={{ background: "#10b981" }} />
              </div>
              <span className={styles.codeCardTitle}>daily_tasks.json</span>
            </div>
            <pre className={styles.codeCardBody}>
{`{
  "problems": [
    {
      "title": "Two Sum",
      "platform": "leetcode",
      "difficulty": 1200,
      "xp": 50,
      "topic": "Arrays"
    },
    {
      "title": "Theatre Square",
      "platform": "codeforces",
      "difficulty": 1000,
      "xp": 35,
      "topic": "Math"
    }
  ],
  "streak": 7,
  "rank": "GOLD 🥇"
}`}
            </pre>
          </div>
          <div className={styles.floatingBadge1}>🔥 7 Day Streak</div>
          <div className={styles.floatingBadge2}>⭐ +150 XP</div>
          <div className={styles.floatingBadge3}>🏆 Rank Up!</div>
        </div>
      </section>

      {/* ── Features Section ───────────────────────────────── */}
      <section id="features" className={styles.features}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>Features</span>
          <h2 className={styles.sectionTitle}>Everything You Need to Crack Placements</h2>
          <p className={styles.sectionSubtitle}>
            A complete preparation ecosystem powered by AI and gamification
          </p>
        </div>

        <div className={styles.featureGrid}>
          {[
            { icon: "🤖", title: "AI Task Engine", desc: "Gemini AI analyzes your Codeforces & LeetCode profiles to generate perfectly-tuned daily problems." },
            { icon: "📱", title: "WhatsApp Integration", desc: "Get daily tasks right in WhatsApp. Just send !daily — no app download needed." },
            { icon: "🔥", title: "Streak System", desc: "Build momentum with daily streaks. Log-capped multipliers reward consistency without being unfair." },
            { icon: "🏆", title: "Rank Progression", desc: "Climb from Bronze to Master. Real-time rank-ups with celebratory notifications." },
            { icon: "📊", title: "Smart Analytics", desc: "Track your weak topics, solve rate, XP history, and competitive standings." },
            { icon: "👥", title: "Leaderboards", desc: "Compete with peers. See who's grinding the hardest this placement season." },
          ].map((feature, i) => (
            <div key={i} className={`glass-card ${styles.featureCard} animate-fade-in-up stagger-${i + 1}`}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDesc}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────── */}
      <section id="how-it-works" className={styles.howItWorks}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>How It Works</span>
          <h2 className={styles.sectionTitle}>Three Steps to Placement Success</h2>
        </div>

        <div className={styles.steps}>
          {[
            { num: "01", title: "Link Your Profiles", desc: "Connect your Codeforces and LeetCode handles. Link your WhatsApp for daily deliveries." },
            { num: "02", title: "Get AI-Curated Tasks", desc: "Our AI analyzes your rating, weak topics, and history to generate 3 targeted problems daily." },
            { num: "03", title: "Solve, Earn XP, Rank Up", desc: "Complete problems to earn XP with streak multipliers. Climb the leaderboard and unlock ranks." },
          ].map((step, i) => (
            <div key={i} className={styles.step}>
              <div className={styles.stepNumber}>{step.num}</div>
              <div className={styles.stepContent}>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
              {i < 2 && <div className={styles.stepConnector} />}
            </div>
          ))}
        </div>
      </section>

      {/* ── Rank Tiers ─────────────────────────────────────── */}
      <section id="ranks" className={styles.ranks}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>Progression</span>
          <h2 className={styles.sectionTitle}>Rank Tiers & Rewards</h2>
        </div>

        <div className={styles.rankCards}>
          {[
            { emoji: "🥉", name: "Bronze", xp: "0", color: "#cd7f32" },
            { emoji: "🥈", name: "Silver", xp: "500", color: "#c0c0c0" },
            { emoji: "🥇", name: "Gold", xp: "2,000", color: "#ffd700" },
            { emoji: "💎", name: "Platinum", xp: "5,000", color: "#e5e4e2" },
            { emoji: "👑", name: "Master", xp: "15,000", color: "#7c3aed" },
          ].map((rank, i) => (
            <div
              key={i}
              className={`glass-card ${styles.rankCard}`}
              style={{ "--rank-color": rank.color } as React.CSSProperties}
            >
              <div className={styles.rankEmoji}>{rank.emoji}</div>
              <h3 className={styles.rankName} style={{ color: rank.color }}>{rank.name}</h3>
              <p className={styles.rankXp}>{rank.xp} XP</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Section ────────────────────────────────────── */}
      <section className={styles.cta}>
        <div className={styles.ctaGlow} />
        <h2 className={styles.ctaTitle}>Ready to Start Your Journey?</h2>
        <p className={styles.ctaSubtitle}>Join now and get your first AI-curated tasks today. Free forever.</p>
        <Link href="/register" className="btn btn-primary btn-lg">
          🚀 Get Started — It&apos;s Free
        </Link>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <span className={styles.logoIcon}>⚡</span>
            <span className={styles.logoText}>HelpMan</span>
            <p>AI-powered placement preparation platform</p>
          </div>
          <div className={styles.footerLinks}>
            <div>
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#how-it-works">How It Works</a>
              <a href="#ranks">Ranks</a>
            </div>
            <div>
              <h4>Legal</h4>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
            </div>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>© 2026 HelpMan. Built by Divyanshu Singh.</p>
        </div>
      </footer>
    </div>
  );
}
