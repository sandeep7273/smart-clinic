import React from "react";
import styles from "./DoctorCard.module.css";
import type { Doctor } from "../../types/doctor.types";

interface DoctorCardProps {
  doctor: Doctor;
  onBookAppointment: (doctor: Doctor) => void;
}

const DoctorCard: React.FC<DoctorCardProps> = ({
  doctor,
  onBookAppointment,
}) => {
  const location = doctor.address
    ? `${doctor.address.city}, ${doctor.address.state}`
    : "Location not available";

  const specializations =
    doctor.specializations?.length > 0
      ? doctor.specializations.join(", ")
      : "General Practice";

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.avatar}>
          {doctor.profileImage ? (
            <img
              src={doctor.profileImage}
              alt={`Dr. ${doctor.firstName}`}
              className={styles.avatarImage}
            />
          ) : (
            <span className={styles.avatarInitials}>
              {doctor.firstName?.[0]}
              {doctor.lastName?.[0]}
            </span>
          )}
        </div>
        <div className={styles.headerInfo}>
          <h3 className={styles.doctorName}>
            Dr. {doctor.firstName} {doctor.lastName}
          </h3>
          <p className={styles.specialization}>{specializations}</p>
          <p className={styles.location}>📍 {location}</p>
        </div>
        {doctor.isVerified && (
          <span className={styles.verifiedBadge}>✓ Verified</span>
        )}
      </div>

      <div className={styles.statsRow}>
        {doctor.rating !== undefined && (
          <div className={styles.stat}>
            <span className={styles.statValue}>
              ⭐ {doctor.rating.toFixed(1)}
            </span>
            <span className={styles.statLabel}>
              {doctor.reviewsCount || doctor.reviewCount || 0} reviews
            </span>
          </div>
        )}
        {doctor.experience !== undefined && (
          <div className={styles.stat}>
            <span className={styles.statValue}>{doctor.experience} yrs</span>
            <span className={styles.statLabel}>Experience</span>
          </div>
        )}
        {doctor.consultationFee !== undefined && (
          <div className={styles.stat}>
            <span className={styles.statValue}>${doctor.consultationFee}</span>
            <span className={styles.statLabel}>Consultation</span>
          </div>
        )}
      </div>

      {doctor.languages && doctor.languages.length > 0 && (
        <div className={styles.languages}>
          <span className={styles.languagesLabel}>Languages: </span>
          {doctor.languages.join(", ")}
        </div>
      )}

      <div className={styles.footer}>
        <span
          className={`${styles.availability} ${doctor.isAvailable ? styles.available : styles.unavailable}`}
        >
          {doctor.isAvailable ? "● Available" : "● Unavailable"}
        </span>
        <button
          className={styles.bookButton}
          onClick={() => onBookAppointment(doctor)}
          disabled={!doctor.isAvailable}
        >
          Book Appointment
        </button>
      </div>
    </div>
  );
};

export default DoctorCard;
