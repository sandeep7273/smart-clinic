import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { loginUser } from "../../store/auth/authThunks";
import { clearError } from "../../store/auth/authSlice";
import { validateField } from "../../utils/validation";
import { useAuth } from "../../context/AuthContext";
import styles from "./LoginPage.module.css";

const LoginPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useAppSelector((s) => s.auth);
  const { checkAuth } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      checkAuth();
      navigate("/doctors", { replace: true });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const validateForm = (): boolean => {
    let valid = true;
    const eErr = validateField("email", email);
    if (eErr) {
      setEmailError(eErr);
      valid = false;
    } else setEmailError(null);
    const pErr = validateField("password", password);
    if (pErr) {
      setPasswordError(pErr);
      valid = false;
    } else setPasswordError(null);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    if (!validateForm()) return;
    await dispatch(loginUser({ email: email.trim(), password }));
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Brand */}
        <div className={styles.brand}>
          <span className={styles.brandIcon}>🏥</span>
          <h1 className={styles.brandName}>Smart Clinic</h1>
          <p className={styles.brandTagline}>Your health, simplified</p>
        </div>

        <h2 className={styles.title}>Welcome Back</h2>
        <p className={styles.subtitle}>Sign in to your account</p>

        {error && (
          <div className={styles.errorBanner}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.formGroup}>
            <label className={styles.label}>Email Address</label>
            <input
              type="email"
              className={`${styles.input} ${emailError ? styles.inputError : ""}`}
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(null);
              }}
              autoComplete="email"
            />
            {emailError && <p className={styles.fieldError}>{emailError}</p>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Password</label>
            <div className={styles.passwordWrapper}>
              <input
                type={showPassword ? "text" : "password"}
                className={`${styles.input} ${passwordError ? styles.inputError : ""}`}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError(null);
                }}
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            {passwordError && (
              <p className={styles.fieldError}>{passwordError}</p>
            )}
          </div>

          <div className={styles.forgotRow}>
            <Link to="/forgot-password" className={styles.forgotLink}>
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? <span className={styles.spinner} /> : "Sign In"}
          </button>
        </form>

        <p className={styles.switchText}>
          Don't have an account?{" "}
          <Link to="/register" className={styles.switchLink}>
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
