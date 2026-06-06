"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./dashboard.module.css";

const NAV_ITEMS = [
  { href: "/dashboard", icon: "📊", label: "Dashboard" },
  { href: "/dashboard/leaderboard", icon: "🏆", label: "Leaderboard" },
  { href: "/dashboard/settings", icon: "⚙️", label: "Settings" },
  { href: "/dashboard/link-whatsapp", icon: "📱", label: "WhatsApp" },
  { href: "/dashboard/admin", icon: "🛡️", label: "Admin" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("helpman_user");
    if (!stored) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(stored));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("helpman_token");
    localStorage.removeItem("helpman_user");
    router.push("/login");
  };

  if (!user) {
    return (
      <div className="loading-container" style={{ minHeight: "100vh" }}>
        <div className="spinner" />
      </div>
    );
  }

  const getRankBadgeClass = (rank: string) => {
    return `badge badge-${rank.toLowerCase()}`;
  };

  return (
    <div className={styles.dashboardLayout}>
      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarHeader}>
          <Link href="/" className={styles.sidebarLogo}>
            <span>⚡</span>
            <span className={styles.sidebarLogoText}>HelpMan</span>
          </Link>
        </div>

        <nav className={styles.sidebarNav}>
          {NAV_ITEMS.map((item) => {
            if (item.href === "/dashboard/admin" && user.role !== "ADMIN") return null;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.sidebarLink} ${isActive ? styles.sidebarLinkActive : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className={styles.sidebarIcon}>{item.icon}</span>
                <span>{item.label}</span>
                {isActive && <div className={styles.activeIndicator} />}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.sidebarUser}>
            <div className={styles.sidebarAvatar}>
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className={styles.sidebarUserInfo}>
              <span className={styles.sidebarUserName}>{user.name}</span>
              <span className={getRankBadgeClass(user.rank || "BRONZE")}>
                {user.rank || "BRONZE"}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className={`${styles.sidebarLink} ${styles.logoutBtn}`}
          >
            <span className={styles.sidebarIcon}>🚪</span>
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile Header ──────────────────────────────── */}
      <header className={styles.mobileHeader}>
        <button
          className={styles.menuBtn}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          ☰
        </button>
        <span className={styles.mobileTitle}>⚡ HelpMan</span>
        <div className={styles.sidebarAvatar} style={{ width: 32, height: 32, fontSize: "0.8rem" }}>
          {user.name?.charAt(0).toUpperCase()}
        </div>
      </header>

      {/* ── Overlay ────────────────────────────────────── */}
      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main Content ───────────────────────────────── */}
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}
