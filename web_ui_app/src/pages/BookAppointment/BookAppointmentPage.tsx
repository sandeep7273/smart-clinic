import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import type { Doctor } from "../../types/doctor.types";
import type { TimeSlot } from "../../types/appointment.types";
import { bookAppointment } from "../../api/appointment.api";
import { getDoctorAvailableSlots } from "../../api/doctor.api";
import { useAuth } from "../../context/AuthContext";
import ErrorModal from "../../components/ErrorModal/ErrorModal";
import {
  getBookingErrorMessage,
  getErrorTitle,
} from "../../utils/errorHandler";
import styles from "./BookAppointmentPage.module.css";

interface LocationState {
  doctor: Doctor;
}

const COMMON_SYMPTOMS = [
  "Fever",
  "Cough",
  "Headache",
  "Fatigue",
  "Body Pain",
  "Nausea",
  "Shortness of Breath",
  "Chest Pain",
];

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const toDateString = (date: Date) => date.toISOString().split("T")[0];

const BookAppointmentPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  useParams<{ doctorId: string }>();
  const { user } = useAuth();
  const doctor = (location.state as LocationState)?.doctor;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [reasonForVisit, setReasonForVisit] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorTitle, setErrorTitle] = useState("Error");
  const [errorMessage, setErrorMessage] = useState("");

  // Redirect if doctor not provided
  useEffect(() => {
    if (!doctor) navigate("/doctors", { replace: true });
  }, [doctor]);

  useEffect(() => {
    if (doctor) loadSlots();
  }, [selectedDate, doctor]);

  const loadSlots = async () => {
    if (!doctor) return;
    try {
      setLoadingSlots(true);
      const response = await getDoctorAvailableSlots(
        doctor.id,
        toDateString(selectedDate),
      );
      if (response.success) setAvailableSlots(response.data.slots || []);
      setSelectedSlot(null);
    } catch {
      /* silent */
    } finally {
      setLoadingSlots(false);
    }
  };

  const showError = (err: any) => {
    setErrorTitle(getErrorTitle(err));
    setErrorMessage(getBookingErrorMessage(err));
    setErrorModalVisible(true);
  };

  const toggleSymptom = (symptom: string) =>
    setSelectedSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom],
    );

  const handleBook = async () => {
    if (!selectedSlot) {
      setErrorTitle("Validation Error");
      setErrorMessage(
        "Please select a time slot before confirming your booking.",
      );
      setErrorModalVisible(true);
      return;
    }
    if (!reasonForVisit.trim()) {
      setErrorTitle("Validation Error");
      setErrorMessage("Please enter the reason for your visit.");
      setErrorModalVisible(true);
      return;
    }

    try {
      setBooking(true);
      const response = await bookAppointment({
        userId: user?.id || "",
        doctorId: doctor!.id,
        date: toDateString(selectedDate),
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        duration: selectedSlot.duration || 30,
        reason: reasonForVisit,
        symptoms: selectedSymptoms.length > 0 ? selectedSymptoms : undefined,
        notes: notes.trim() || undefined,
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        email: user?.email || "",
        phone: user?.phoneNumber || undefined,
        dateOfBirth: user?.dateOfBirth || undefined,
      });

      if (response.success) {
        navigate("/booking-confirmation", {
          state: { appointment: response.data, doctor },
          replace: true,
        });
      }
    } catch (err: any) {
      showError(err);
    } finally {
      setBooking(false);
    }
  };

  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  const isToday = (d: Date) => d.toDateString() === today.toDateString();
  const isTomorrow = (d: Date) => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return d.toDateString() === t.toDateString();
  };

  const quickDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  if (!doctor) return null;

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
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1 className={styles.pageTitle}>Book Appointment</h1>
        <div />
      </header>

      <main className={styles.main}>
        {/* Doctor Info Card */}
        <div className={styles.doctorCard}>
          <div className={styles.doctorAvatar}>
            {doctor.firstName?.[0]}
            {doctor.lastName?.[0]}
          </div>
          <div>
            <h2 className={styles.doctorName}>
              Dr. {doctor.firstName} {doctor.lastName}
            </h2>
            <p className={styles.doctorSpecialty}>
              {doctor.specializations?.join(", ")}
            </p>
            <p className={styles.doctorMeta}>
              ⭐ {doctor.rating?.toFixed(1)} ·{" "}
              {doctor.reviewsCount || doctor.reviewCount || 0} reviews
              {doctor.consultationFee !== undefined &&
                ` · $${doctor.consultationFee}`}
            </p>
          </div>
        </div>

        {/* Date Selection */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Select Date</h3>
          <div className={styles.quickDates}>
            {quickDates.map((d, i) => (
              <button
                key={i}
                className={`${styles.quickDateBtn} ${d.toDateString() === selectedDate.toDateString() ? styles.quickDateActive : ""}`}
                onClick={() => setSelectedDate(d)}
              >
                <span className={styles.quickDateDay}>
                  {d.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <span className={styles.quickDateNum}>{d.getDate()}</span>
                {isToday(d) && (
                  <span className={styles.quickDateLabel}>Today</span>
                )}
                {isTomorrow(d) && (
                  <span className={styles.quickDateLabel}>Tomorrow</span>
                )}
              </button>
            ))}
          </div>
          <div className={styles.datePickerRow}>
            <label className={styles.datePickerLabel}>Or pick a date: </label>
            <input
              type="date"
              className={styles.datePicker}
              value={toDateString(selectedDate)}
              min={toDateString(today)}
              max={toDateString(maxDate)}
              onChange={(e) => {
                if (e.target.value)
                  setSelectedDate(new Date(e.target.value + "T00:00:00"));
              }}
            />
          </div>
          <p className={styles.selectedDateText}>{formatDate(selectedDate)}</p>
        </section>

        {/* Time Slots */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Available Time Slots</h3>
          {loadingSlots ? (
            <div className={styles.loadingRow}>
              <div className={styles.spinner} /> Loading slots...
            </div>
          ) : availableSlots.length === 0 ? (
            <div className={styles.noSlots}>
              <span>😔</span>
              <p>No available slots for this date. Please try another date.</p>
            </div>
          ) : (
            <div className={styles.slotsGrid}>
              {availableSlots.map((slot, i) => (
                <button
                  key={i}
                  className={`${styles.slotBtn} ${selectedSlot === slot ? styles.slotActive : ""} ${!slot.available ? styles.slotUnavailable : ""}`}
                  onClick={() => slot.available && setSelectedSlot(slot)}
                  disabled={!slot.available}
                >
                  {slot.startTime}
                </button>
              ))}
            </div>
          )}
          {selectedSlot && (
            <div className={styles.selectedSlotInfo}>
              ✅ Selected: {selectedSlot.startTime} – {selectedSlot.endTime}
            </div>
          )}
        </section>

        {/* Reason for Visit */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Reason for Visit *</h3>
          <textarea
            className={styles.textarea}
            placeholder="Describe why you're visiting (required)"
            value={reasonForVisit}
            onChange={(e) => setReasonForVisit(e.target.value)}
            rows={3}
          />
        </section>

        {/* Symptoms */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Symptoms (optional)</h3>
          <div className={styles.symptomsGrid}>
            {COMMON_SYMPTOMS.map((symptom) => (
              <button
                key={symptom}
                className={`${styles.symptomChip} ${selectedSymptoms.includes(symptom) ? styles.symptomChipActive : ""}`}
                onClick={() => toggleSymptom(symptom)}
              >
                {symptom}
              </button>
            ))}
          </div>
        </section>

        {/* Additional Notes */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Additional Notes (optional)</h3>
          <textarea
            className={styles.textarea}
            placeholder="Any additional information for the doctor..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </section>

        {/* Confirm Button */}
        <button
          className={styles.confirmButton}
          onClick={handleBook}
          disabled={booking || !selectedSlot}
        >
          {booking ? <span className={styles.spinner} /> : "✅ Confirm Booking"}
        </button>
      </main>
    </div>
  );
};

export default BookAppointmentPage;
