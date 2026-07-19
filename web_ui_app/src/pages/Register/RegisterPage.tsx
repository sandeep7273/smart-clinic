import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { registerUser } from "../../store/auth/authThunks";
import { clearError } from "../../store/auth/authSlice";
import { validateField } from "../../utils/validation";
import { useAuth } from "../../context/AuthContext";
import styles from "./RegisterPage.module.css";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  dateOfBirth: string;
}

const RegisterPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useAppSelector((s) => s.auth);
  const { checkAuth } = useAuth();

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    dateOfBirth: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});

  useEffect(() => {
    if (isAuthenticated) {
      checkAuth();
      navigate("/doctors", { replace: true });
    }
  }, [isAuthenticated]);

  useEffect(
    () => () => {
      dispatch(clearError());
    },
    [dispatch],
  );

  const update = (field: keyof FormData, value: string) => {
    setFormData((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: "" }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<FormData> = {};
    let valid = true;

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
      valid = false;
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
      valid = false;
    }

    const eErr = validateField("email", formData.email);
    if (eErr) {
      newErrors.email = eErr;
      valid = false;
    }

    if (formData.phoneNumber) {
      const pErr = validateField("phoneNumber", formData.phoneNumber);
      if (pErr) {
        newErrors.phoneNumber = pErr;
        valid = false;
      }
    }

    const pwErr = validateField("password", formData.password);
    if (pwErr) {
      newErrors.password = pwErr;
      valid = false;
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    if (!validate()) return;

    const payload: any = {
      email: formData.email.trim(),
      password: formData.password,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      role: "patient" as const,
    };
    if (formData.phoneNumber) payload.phoneNumber = formData.phoneNumber.trim();
    if (formData.dateOfBirth) payload.dateOfBirth = formData.dateOfBirth;

    await dispatch(registerUser(payload));
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>🏥</span>
          <h1 className={styles.brandName}>Smart Clinic</h1>
        </div>

        <h2 className={styles.title}>Create Account</h2>
        <p className={styles.subtitle}>Join Smart Clinic today</p>

        {error && <div className={styles.errorBanner}>⚠️ {error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label className={styles.label}>First Name *</label>
              <input
                className={`${styles.input} ${errors.firstName ? styles.inputError : ""}`}
                placeholder="First name"
                value={formData.firstName}
                onChange={(e) => update("firstName", e.target.value)}
              />
              {errors.firstName && (
                <p className={styles.fieldError}>{errors.firstName}</p>
              )}
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Last Name *</label>
              <input
                className={`${styles.input} ${errors.lastName ? styles.inputError : ""}`}
                placeholder="Last name"
                value={formData.lastName}
                onChange={(e) => update("lastName", e.target.value)}
              />
              {errors.lastName && (
                <p className={styles.fieldError}>{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Email Address *</label>
            <input
              type="email"
              className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => update("email", e.target.value)}
              autoComplete="email"
            />
            {errors.email && (
              <p className={styles.fieldError}>{errors.email}</p>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Phone Number (optional)</label>
            <input
              type="tel"
              className={`${styles.input} ${errors.phoneNumber ? styles.inputError : ""}`}
              placeholder="+1 (555) 000-0000"
              value={formData.phoneNumber}
              onChange={(e) => update("phoneNumber", e.target.value)}
            />
            {errors.phoneNumber && (
              <p className={styles.fieldError}>{errors.phoneNumber}</p>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Date of Birth (optional)</label>
            <input
              type="date"
              className={styles.input}
              value={formData.dateOfBirth}
              onChange={(e) => update("dateOfBirth", e.target.value)}
              max={new Date().toISOString().split("T")[0]}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Password *</label>
            <div className={styles.passwordWrapper}>
              <input
                type={showPassword ? "text" : "password"}
                className={`${styles.input} ${errors.password ? styles.inputError : ""}`}
                placeholder="Min. 6 characters"
                value={formData.password}
                onChange={(e) => update("password", e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            {errors.password && (
              <p className={styles.fieldError}>{errors.password}</p>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Confirm Password *</label>
            <div className={styles.passwordWrapper}>
              <input
                type={showConfirm ? "text" : "password"}
                className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ""}`}
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowConfirm((v) => !v)}
              >
                {showConfirm ? "🙈" : "👁️"}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className={styles.fieldError}>{errors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? <span className={styles.spinner} /> : "Create Account"}
          </button>
        </form>

        <p className={styles.switchText}>
          Already have an account?{" "}
          <Link to="/login" className={styles.switchLink}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
