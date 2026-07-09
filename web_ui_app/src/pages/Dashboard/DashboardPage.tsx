import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { logoutUser } from "../../store/auth/authThunks";
import styles from "./DashboardPage.module.css";

const DashboardPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      await dispatch(logoutUser());
      navigate("/login", { replace: true });
    }
  };

  const features = [
    {
      id: "find-doctor",
      title: "Find Doctors",
      icon: "🔍",
      description: "Search for doctors by specialty, location, or name",
      available: true,
      path: "/doctors",
    },
    {
      id: "ai-search",
      title: "AI Assistant",
      icon: "🤖",
      description: "Chat with AI to find doctors based on your symptoms",
      available: true,
      path: "/ai-assistant",
    },
    {
      id: "appointments",
      title: "My Appointments",
      icon: "📅",
      description: "View and manage your appointments",
      available: true,
      path: "/appointments",
    },
    {
      id: "profile",
      title: "My Profile",
      icon: "👤",
      description: "Manage your account settings",
      available: false,
      path: null,
    },
  ];

  return (
    <div className={styles.container}>
      {/* Navbar */}
      <header className={styles.navbar}>
        <div className={styles.navBrand}>
          <span>🏥</span> Smart Clinic
        </div>
        <nav className={styles.navLinks}>
          <Link to="/doctors" className={styles.navLink}>
            Doctors
          </Link>
          <Link to="/appointments" className={styles.navLink}>
            Appointments
          </Link>
          <Link to="/ai-assistant" className={styles.navLink}>
            AI Chat
          </Link>
        </nav>
        <button onClick={handleLogout} className={styles.logoutButton}>
          🚪 Logout
        </button>
      </header>

      <main className={styles.main}>
        {/* Hero */}
        <div className={styles.hero}>
          <div>
            <h1 className={styles.greeting}>
              Welcome back, {user?.firstName || "User"}! 👋
            </h1>
            <p className={styles.heroSubtitle}>How can we help you today?</p>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          {[
            { label: "Upcoming", value: "—", icon: "📆" },
            { label: "Completed", value: "—", icon: "✅" },
            { label: "Cancelled", value: "—", icon: "❌" },
          ].map((stat) => (
            <div key={stat.label} className={styles.statCard}>
              <span className={styles.statIcon}>{stat.icon}</span>
              <span className={styles.statValue}>{stat.value}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Features */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>What would you like to do?</h2>
          <div className={styles.featuresGrid}>
            {features.map((feature) =>
              feature.available && feature.path ? (
                <Link
                  key={feature.id}
                  to={feature.path}
                  className={styles.featureCard}
                >
                  <span className={styles.featureIcon}>{feature.icon}</span>
                  <h3 className={styles.featureTitle}>{feature.title}</h3>
                  <p className={styles.featureDesc}>{feature.description}</p>
                </Link>
              ) : (
                <div
                  key={feature.id}
                  className={`${styles.featureCard} ${styles.featureCardDisabled}`}
                >
                  <span className={styles.featureIcon}>{feature.icon}</span>
                  <h3 className={styles.featureTitle}>{feature.title}</h3>
                  <p className={styles.featureDesc}>{feature.description}</p>
                  <span className={styles.comingSoon}>Coming Soon</span>
                </div>
              ),
            )}
          </div>
        </section>

        {/* User Info */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Your Information</h2>
          <div className={styles.infoCard}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Email</span>
              <span className={styles.infoValue}>{user?.email}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Phone</span>
              <span className={styles.infoValue}>
                {user?.phoneNumber || "Not provided"}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Account Type</span>
              <span className={`${styles.infoValue} ${styles.roleChip}`}>
                {user?.role?.toUpperCase() || "PATIENT"}
              </span>
            </div>
          </div>
        </section>

        <footer className={styles.footer}>
          <p className={styles.footerText}>Smart Appointment System v1.0.0</p>
          <p className={styles.footerSub}>Your health, simplified</p>
        </footer>
      </main>
    </div>
  );
};

export default DashboardPage;
