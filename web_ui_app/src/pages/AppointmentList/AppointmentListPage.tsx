import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Appointment } from "../../types/appointment.types";
import { getPatientAppointments } from "../../api/appointment.api";
import { useAuth } from "../../context/AuthContext";
import ErrorModal from "../../components/ErrorModal/ErrorModal";
import { getErrorMessage, getErrorTitle } from "../../utils/errorHandler";
import styles from "./AppointmentListPage.module.css";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "#FFF3E0", text: "#F57C00" },
  confirmed: { bg: "#E8F5E9", text: "#388E3C" },
  cancelled: { bg: "#FFEBEE", text: "#D32F2F" },
  completed: { bg: "#E3F2FD", text: "#1976D2" },
  no_show: { bg: "#F3E5F5", text: "#7B1FA2" },
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const AppointmentListPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorTitle, setErrorTitle] = useState("Error");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const fetchAppointments = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const response = await getPatientAppointments(
        user?.id || "",
        statusFilter || undefined,
        50,
      );
      if (response.success) setAppointments(response.data);
    } catch (err: any) {
      setErrorTitle(getErrorTitle(err));
      setErrorMessage(getErrorMessage(err));
      setErrorModalVisible(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter]);

  const statusColors = (status: string) =>
    STATUS_COLORS[status.toLowerCase()] || { bg: "#f5f5f5", text: "#666" };

  const statuses = ["", "pending", "confirmed", "completed", "cancelled"];

  return (
    <div className={styles.container}>
      <ErrorModal
        visible={errorModalVisible}
        title={errorTitle}
        message={errorMessage}
        onClose={() => setErrorModalVisible(false)}
      />

      {/* Header */}
      <header className={styles.header}>
        <Link to="/dashboard" className={styles.backLink}>
          ← Dashboard
        </Link>
        <h1 className={styles.pageTitle}>📅 My Appointments</h1>
        <button
          className={styles.aiButton}
          onClick={() => navigate("/ai-assistant")}
        >
          🤖 AI Chat
        </button>
      </header>

      <main className={styles.main}>
        {/* Status Filter */}
        <div className={styles.filterRow}>
          {statuses.map((s) => (
            <button
              key={s || "all"}
              className={`${styles.filterChip} ${statusFilter === s ? styles.filterChipActive : ""}`}
              onClick={() => setStatusFilter(s)}
            >
              {s ? s.charAt(0).toUpperCase() + s.slice(1) : "All"}
            </button>
          ))}
          <button
            className={styles.refreshBtn}
            onClick={() => fetchAppointments(true)}
            disabled={refreshing}
          >
            {refreshing ? "↻" : "🔄"} Refresh
          </button>
        </div>

        {loading ? (
          <div className={styles.loadingCenter}>
            <div className={styles.spinner} />
            <p>Loading appointments...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className={styles.emptyBox}>
            <span className={styles.emptyIcon}>📅</span>
            <h3>No Appointments</h3>
            <p>You haven't booked any appointments yet.</p>
            <Link to="/doctors" className={styles.browseButton}>
              Browse Doctors
            </Link>
          </div>
        ) : (
          <div className={styles.list}>
            {appointments.map((appt) => {
              const colors = statusColors(appt.status);
              return (
                <div
                  key={appt.id}
                  className={styles.appointmentCard}
                  onClick={() => setSelectedAppointment(appt)}
                >
                  <div className={styles.cardTop}>
                    <div>
                      <p className={styles.apptNumber}>
                        #{appt.appointmentNumber}
                      </p>
                      <p className={styles.doctorName}>
                        Dr. {appt.doctor?.firstName} {appt.doctor?.lastName}
                      </p>
                      {appt.doctor?.specializations?.length > 0 && (
                        <p className={styles.specialization}>
                          {appt.doctor.specializations[0]}
                        </p>
                      )}
                    </div>
                    <span
                      className={styles.statusBadge}
                      style={{ background: colors.bg, color: colors.text }}
                    >
                      {appt.status.toUpperCase()}
                    </span>
                  </div>
                  <div className={styles.cardDetails}>
                    <span>📅 {formatDate(appt.date)}</span>
                    <span>
                      🕐 {appt.startTime} – {appt.endTime}
                    </span>
                    <span className={styles.reason}>📝 {appt.reason}</span>
                  </div>
                  <p className={styles.bookedOn}>
                    Booked on {formatDate(appt.createdAt)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <div
          className={styles.modalOverlay}
          onClick={() => setSelectedAppointment(null)}
        >
          <div
            className={styles.detailModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>Appointment Details</h3>
              <button
                className={styles.closeModal}
                onClick={() => setSelectedAppointment(null)}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalRow}>
                <span>Reference</span>
                <span className={styles.refNum}>
                  #{selectedAppointment.appointmentNumber}
                </span>
              </div>
              <div className={styles.modalRow}>
                <span>Doctor</span>
                <span>
                  Dr. {selectedAppointment.doctor?.firstName}{" "}
                  {selectedAppointment.doctor?.lastName}
                </span>
              </div>
              <div className={styles.modalRow}>
                <span>Date</span>
                <span>{formatDate(selectedAppointment.date)}</span>
              </div>
              <div className={styles.modalRow}>
                <span>Time</span>
                <span>
                  {selectedAppointment.startTime} –{" "}
                  {selectedAppointment.endTime}
                </span>
              </div>
              <div className={styles.modalRow}>
                <span>Status</span>
                <span>{selectedAppointment.status}</span>
              </div>
              <div className={styles.modalRow}>
                <span>Reason</span>
                <span>{selectedAppointment.reason}</span>
              </div>
              {selectedAppointment.notes && (
                <div className={styles.modalRow}>
                  <span>Notes</span>
                  <span>{selectedAppointment.notes}</span>
                </div>
              )}
            </div>
            <button
              className={styles.modalCloseButton}
              onClick={() => setSelectedAppointment(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentListPage;
