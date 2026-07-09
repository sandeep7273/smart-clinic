import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { Appointment } from "../../types/appointment.types";
import type { Doctor } from "../../types/doctor.types";
import styles from "./BookingConfirmationPage.module.css";

interface LocationState {
  appointment: Appointment;
  doctor: Doctor;
}

const BookingConfirmationPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  if (!state?.appointment) {
    navigate("/appointments", { replace: true });
    return null;
  }

  const { appointment, doctor } = state;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.successIcon}>🎉</div>
        <h1 className={styles.title}>Booking Confirmed!</h1>
        <p className={styles.subtitle}>
          Your appointment has been successfully booked.
        </p>

        <div className={styles.refBox}>
          <span className={styles.refLabel}>Reference #</span>
          <span className={styles.refNumber}>
            {appointment.appointmentNumber}
          </span>
        </div>

        <div className={styles.detailsList}>
          <div className={styles.detailRow}>
            <span className={styles.detailIcon}>👨‍⚕️</span>
            <div>
              <p className={styles.detailLabel}>Doctor</p>
              <p className={styles.detailValue}>
                Dr. {doctor.firstName} {doctor.lastName}
              </p>
              <p className={styles.detailSub}>
                {doctor.specializations?.join(", ")}
              </p>
            </div>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailIcon}>📅</span>
            <div>
              <p className={styles.detailLabel}>Date</p>
              <p className={styles.detailValue}>
                {formatDate(appointment.date)}
              </p>
            </div>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailIcon}>🕐</span>
            <div>
              <p className={styles.detailLabel}>Time</p>
              <p className={styles.detailValue}>
                {appointment.startTime} – {appointment.endTime}
              </p>
            </div>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailIcon}>📝</span>
            <div>
              <p className={styles.detailLabel}>Status</p>
              <span className={styles.statusBadge}>
                {appointment.status?.toUpperCase()}
              </span>
            </div>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailIcon}>💬</span>
            <div>
              <p className={styles.detailLabel}>Reason</p>
              <p className={styles.detailValue}>{appointment.reason}</p>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <Link to="/appointments" className={styles.primaryButton}>
            View My Appointments
          </Link>
          <Link to="/doctors" className={styles.secondaryButton}>
            Find More Doctors
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmationPage;
