import React, { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPasswordApi } from "../../api/auth.api";
import { isValidEmail } from "../../utils/validation";
import styles from "./ForgotPasswordPage.module.css";

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);
      await forgotPasswordApi(email.trim());
      setSent(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to send reset email",
      );
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.successIcon}>📧</div>
          <h2 className={styles.title}>Check Your Email</h2>
          <p className={styles.message}>
            We've sent a password reset link to <strong>{email}</strong>. Please
            check your inbox.
          </p>
          <Link to="/login" className={styles.backButton}>
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>🏥</span>
          <h1 className={styles.brandName}>Smart Clinic</h1>
        </div>

        <div className={styles.lockIcon}>🔒</div>
        <h2 className={styles.title}>Forgot Password</h2>
        <p className={styles.subtitle}>
          Enter your email address and we'll send you a link to reset your
          password.
        </p>

        {error && <div className={styles.errorBanner}>⚠️ {error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.formGroup}>
            <label className={styles.label}>Email Address</label>
            <input
              type="email"
              className={styles.input}
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? <span className={styles.spinner} /> : "Send Reset Link"}
          </button>
        </form>

        <p className={styles.switchText}>
          Remember your password?{" "}
          <Link to="/login" className={styles.switchLink}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
