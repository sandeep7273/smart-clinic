import React from "react";
import { Link } from "react-router-dom";
import styles from "./NotFound.module.css";

const NotFoundPage: React.FC = () => (
  <div className={styles.container}>
    <div className={styles.content}>
      <div className={styles.icon}>🏥</div>
      <h1 className={styles.code}>404</h1>
      <h2 className={styles.title}>Page Not Found</h2>
      <p className={styles.message}>
        The page you're looking for doesn't exist.
      </p>
      <Link to="/dashboard" className={styles.link}>
        Go to Dashboard
      </Link>
    </div>
  </div>
);

export default NotFoundPage;
