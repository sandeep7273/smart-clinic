import React from "react";
import styles from "./ErrorModal.module.css";

interface ErrorModalProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

const ErrorModal: React.FC<ErrorModalProps> = ({
  visible,
  title,
  message,
  onClose,
}) => {
  if (!visible) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.iconWrap}>
          <span className={styles.icon}>⚠️</span>
        </div>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.message}>{message}</p>
        <button className={styles.closeButton} onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
};

export default ErrorModal;
