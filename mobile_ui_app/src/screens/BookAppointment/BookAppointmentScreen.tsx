/**
 * BookAppointmentScreen
 * Screen for booking appointments with available time slots
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Doctor } from '../../types/doctor.types';
import { TimeSlot } from '../../types/appointment.types';
import { bookAppointment } from '../../api/appointment.api';
import { getDoctorAvailableSlots } from '../../api/doctor.api';
import { BookAppointmentScreenProps } from '../../navigation/types';
import { ErrorModal } from '../../components/ErrorModal';
import { getBookingErrorMessage, getErrorTitle } from '../../utils/errorHandler';
import { useAuth } from '../../context/AuthContext';

export default function BookAppointmentScreen({ route, navigation }: BookAppointmentScreenProps) {
  const { doctor } = route.params;
  const { user } = useAuth();

  // State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);

  // Error modal state
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorTitle, setErrorTitle] = useState('Error');
  const [errorMessage, setErrorMessage] = useState('');

  // Form data
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Available symptoms
  const commonSymptoms = [
    'Fever',
    'Cough',
    'Headache',
    'Fatigue',
    'Body Pain',
    'Nausea',
    'Shortness of Breath',
    'Chest Pain',
  ];

  /**
   * Load available slots when date or location changes
   */
  useEffect(() => {
    loadAvailableSlots();
  }, [selectedDate, selectedLocation]);

  /**
   * Set default location on mount
   */
  useEffect(() => {
    if (doctor.address) {
      const fullAddress = `${doctor.address.street}, ${doctor.address.city}, ${doctor.address.state} ${doctor.address.zipCode}`;
      setSelectedLocation(fullAddress);
    }
  }, []);

  /**
   * Show error modal with formatted message
   */
  const showError = (error: any) => {
    setErrorTitle(getErrorTitle(error));
    setErrorMessage(getBookingErrorMessage(error));
    setErrorModalVisible(true);
  };

  /**
   * Load available time slots for the selected date
   */
  const loadAvailableSlots = async () => {
    if (!selectedLocation) return;

    try {
      setLoading(true);
      const dateStr = selectedDate.toISOString().split('T')[0]; // Convert Date to YYYY-MM-DD
      const response = await getDoctorAvailableSlots(dateStr, doctor.id);
      if (response.success && response.data.slots) {
        setAvailableSlots(response.data.slots);
      }
      setSelectedSlot(null); // Reset selection when slots change
    } catch (error) {
      console.error('Error loading slots:', error);
      Alert.alert('Error', 'Failed to load available slots');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle date change
   */
  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  /**
   * Handle location selection
   */
  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location);
  };

  /**
   * Handle slot selection
   */
  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  /**
   * Toggle symptom selection
   */
  const toggleSymptom = (symptom: string) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(prev => prev.filter(s => s !== symptom));
    } else {
      setSelectedSymptoms(prev => [...prev, symptom]);
    }
  };

  /**
   * Handle confirm booking
   */
  const handleConfirmBooking = async () => {
    // Validation
    if (!selectedSlot) {
      setErrorTitle('Validation Error');
      setErrorMessage('Please select a time slot before confirming your booking.');
      setErrorModalVisible(true);
      return;
    }

    if (!reasonForVisit.trim()) {
      setErrorTitle('Validation Error');
      setErrorMessage('Please enter the reason for your visit. This helps the doctor prepare for your appointment.');
      setErrorModalVisible(true);
      return;
    }

    try {
      setBooking(true);
      console.log("debugging Booking appointment with data:", doctor);
      const bookingData = {
        userId: user?.id || '', // Patient user ID from logged-in user
        doctorId: doctor.id,
        date: selectedDate.toISOString().split('T')[0], // Format: YYYY-MM-DD
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        duration: selectedSlot.duration || 30, // Default to 30 minutes if not specified
        reason: reasonForVisit,
        symptoms: selectedSymptoms.length > 0 ? selectedSymptoms : undefined,
        notes: notes.trim() || undefined,
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        phone: user?.phoneNumber || undefined, // Send undefined instead of empty string
        dateOfBirth: user?.dateOfBirth || undefined, // Send undefined instead of empty string
      };

      console.log('debugging Booking appointment:', bookingData);

      const response = await bookAppointment(bookingData);

      if (response.success) {
        // Navigate to confirmation screen
        navigation.replace('BookingConfirmation', {
          appointment: response.data,
          doctor: doctor,
        });
      } else {
        setErrorTitle('Booking Failed');
        setErrorMessage(response.message || 'Failed to book appointment. Please try again.');
        setErrorModalVisible(true);
      }
    } catch (error: any) {
      console.error('Error booking appointment:', error);
      showError(error);
    } finally {
      setBooking(false);
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (date: Date): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  /**
   * Check if date is today
   */
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  /**
   * Check if date is tomorrow
   */
  const isTomorrow = (date: Date): boolean => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  };

  /**
   * Get minimum date (today)
   */
  const getMinDate = (): Date => {
    return new Date();
  };

  /**
   * Get maximum date (30 days from now)
   */
  const getMaxDate = (): Date => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    return maxDate;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Appointment</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Doctor Info */}
        <View style={styles.doctorInfo}>
          <Text style={styles.doctorName}>
            Dr. {doctor.firstName} {doctor.lastName}
          </Text>
          <Text style={styles.doctorSpecialty}>{doctor.specializations.join(', ')}</Text>
          <Text style={styles.doctorRating}>⭐ {doctor.rating} ({doctor.reviewCount} reviews)</Text>
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          
          {/* Quick Date Buttons */}
          <View style={styles.quickDateButtons}>
            <TouchableOpacity
              style={[
                styles.quickDateButton,
                isToday(selectedDate) && styles.quickDateButtonActive,
              ]}
              onPress={() => setSelectedDate(new Date())}
            >
              <Text
                style={[
                  styles.quickDateButtonText,
                  isToday(selectedDate) && styles.quickDateButtonTextActive,
                ]}
              >
                Today
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.quickDateButton,
                isTomorrow(selectedDate) && styles.quickDateButtonActive,
              ]}
              onPress={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setSelectedDate(tomorrow);
              }}
            >
              <Text
                style={[
                  styles.quickDateButtonText,
                  isTomorrow(selectedDate) && styles.quickDateButtonTextActive,
                ]}
              >
                Tomorrow
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickDateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.quickDateButtonText}>Choose Date</Text>
            </TouchableOpacity>
          </View>

          {/* Selected Date Display */}
          <View style={styles.selectedDateContainer}>
            <Text style={styles.selectedDateLabel}>Selected Date:</Text>
            <Text style={styles.selectedDate}>{formatDate(selectedDate)}</Text>
          </View>

          {/* Date Picker */}
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={getMinDate()}
              maximumDate={getMaxDate()}
            />
          )}
        </View>

        {/* Location Display */}
        {doctor.address && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Clinic Location</Text>
            <View style={styles.locationCard}>
              <Text style={styles.locationAddress}>
                {doctor.address.street}
              </Text>
              <Text style={styles.locationCity}>
                {doctor.address.city}, {doctor.address.state} {doctor.address.zipCode}
              </Text>
            </View>
          </View>
        )}

        {/* Available Time Slots */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Time Slots</Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading slots...</Text>
            </View>
          ) : availableSlots.length === 0 ? (
            <View style={styles.noSlotsContainer}>
              <Text style={styles.noSlotsText}>No slots available for this date</Text>
              <Text style={styles.noSlotsSubtext}>Please try another date</Text>
            </View>
          ) : (
            <View style={styles.slotsGrid}>
              {availableSlots.map((slot, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.slotCard,
                    selectedSlot?.startTime === slot.startTime && styles.slotCardActive,
                  ]}
                  onPress={() => handleSlotSelect(slot)}
                >
                  <Text
                    style={[
                      styles.slotTime,
                      selectedSlot?.startTime === slot.startTime && styles.slotTimeActive,
                    ]}
                  >
                    {slot.startTime}
                  </Text>
                  <Text
                    style={[
                      styles.slotTo,
                      selectedSlot?.startTime === slot.startTime && styles.slotToActive,
                    ]}
                  >
                    to
                  </Text>
                  <Text
                    style={[
                      styles.slotTime,
                      selectedSlot?.startTime === slot.startTime && styles.slotTimeActive,
                    ]}
                  >
                    {slot.endTime}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Reason for Visit */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reason for Visit *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Regular checkup, Flu symptoms, Follow-up"
            value={reasonForVisit}
            onChangeText={setReasonForVisit}
            multiline
          />
        </View>

        {/* Symptoms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Symptoms (Optional)</Text>
          <View style={styles.symptomsGrid}>
            {commonSymptoms.map((symptom, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.symptomChip,
                  selectedSymptoms.includes(symptom) && styles.symptomChipActive,
                ]}
                onPress={() => toggleSymptom(symptom)}
              >
                <Text
                  style={[
                    styles.symptomChipText,
                    selectedSymptoms.includes(symptom) && styles.symptomChipTextActive,
                  ]}
                >
                  {symptom}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Additional Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Any additional information for the doctor..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Spacing for button */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Confirm Booking Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            (!selectedSlot || !reasonForVisit.trim() || booking) && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirmBooking}
          disabled={!selectedSlot || !reasonForVisit.trim() || booking}
        >
          {booking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm Booking</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Error Modal */}
      <ErrorModal
        visible={errorModalVisible}
        title={errorTitle}
        message={errorMessage}
        onClose={() => setErrorModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingTop: 50,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  doctorInfo: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  doctorName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  doctorSpecialty: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  doctorRating: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  quickDateButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quickDateButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quickDateButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  quickDateButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  quickDateButtonTextActive: {
    color: '#fff',
  },
  selectedDateContainer: {
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedDateLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  selectedDate: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  locationCard: {
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  locationCardActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  locationNameActive: {
    color: '#007AFF',
  },
  locationAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  locationAddressActive: {
    color: '#555',
  },
  locationCity: {
    fontSize: 12,
    color: '#999',
  },
  locationCityActive: {
    color: '#666',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  noSlotsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noSlotsText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  noSlotsSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotCard: {
    width: '31%',
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  slotCardActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  slotTime: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  slotTimeActive: {
    color: '#fff',
  },
  slotTo: {
    fontSize: 10,
    color: '#999',
    marginVertical: 2,
  },
  slotToActive: {
    color: '#e0e0e0',
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  notesInput: {
    minHeight: 100,
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  symptomChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  symptomChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  symptomChipText: {
    fontSize: 14,
    color: '#666',
  },
  symptomChipTextActive: {
    color: '#fff',
  },
  bottomSpacing: {
    height: 80,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
