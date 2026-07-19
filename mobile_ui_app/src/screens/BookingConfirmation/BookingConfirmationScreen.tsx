/**
 * BookingConfirmationScreen
 * Displays appointment booking confirmation details
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { BookingConfirmationScreenProps } from '../../navigation/types';

export default function BookingConfirmationScreen({ route, navigation }: BookingConfirmationScreenProps) {
  const { appointment, doctor } = route.params;

  /**
   * Format date for display
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  /**
   * Handle view my bookings
   */
  const handleViewMyBookings = () => {
    // Navigate to appointments list screen
    navigation.navigate('AppointmentList');
  };

  /**
   * Handle back button - go to doctor list
   */
  const handleBack = () => {
    navigation.navigate('DoctorList');
  };

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.successIcon}>
          <Text style={styles.checkmark}>✓</Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Confirmation Title */}
        <Text style={styles.title}>Booking Confirmed</Text>
        <Text style={styles.subtitle}>
          Your appointment has been successfully booked
        </Text>

        {/* Appointment Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Appointment Details</Text>
          
          {/* Appointment Number */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Appointment Number</Text>
            <Text style={styles.detailValue}>{appointment.appointmentNumber}</Text>
          </View>

          {/* Date */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{formatDate(appointment.date)}</Text>
          </View>

          {/* Time */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time</Text>
            <Text style={styles.detailValue}>
              {appointment.startTime} - {appointment.endTime}
            </Text>
          </View>

          {/* Status */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{appointment.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Doctor Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Doctor Information</Text>
          
          {/* Doctor Name */}
          <View style={styles.doctorHeader}>
            <View style={styles.doctorAvatar}>
              <Text style={styles.doctorInitial}>
                {doctor.firstName.charAt(0)}{doctor.lastName.charAt(0)}
              </Text>
            </View>
            <View style={styles.doctorInfo}>
              <Text style={styles.doctorName}>
                Dr. {doctor.firstName} {doctor.lastName}
              </Text>
              <Text style={styles.doctorSpecialty}>
                {doctor.specializations.join(', ')}
              </Text>
              <Text style={styles.doctorRating}>
                ⭐ {doctor.rating} ({doctor.reviewCount} reviews)
              </Text>
            </View>
          </View>

          {/* Clinic Location */}
          {doctor.address && (
            <View style={styles.locationSection}>
              <Text style={styles.locationLabel}>Clinic Address</Text>
              <Text style={styles.locationAddress}>{doctor.address.street}</Text>
              <Text style={styles.locationCity}>
                {doctor.address.city}, {doctor.address.state} {doctor.address.zipCode}
              </Text>
            </View>
          )}

          {/* Contact */}
          <View style={styles.contactSection}>
            <View style={styles.contactRow}>
              <Text style={styles.contactLabel}>Phone:</Text>
              <Text style={styles.contactValue}>{doctor.phone}</Text>
            </View>
            <View style={styles.contactRow}>
              <Text style={styles.contactLabel}>Email:</Text>
              <Text style={styles.contactValue}>{doctor.email}</Text>
            </View>
          </View>
        </View>

        {/* Reason for Visit */}
        {appointment.reason && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Reason for Visit</Text>
            <Text style={styles.reasonText}>{appointment.reason}</Text>
            
            {appointment.symptoms && appointment.symptoms.length > 0 && (
              <View style={styles.symptomsSection}>
                <Text style={styles.symptomsLabel}>Symptoms:</Text>
                <View style={styles.symptomsGrid}>
                  {appointment.symptoms.map((symptom, index) => (
                    <View key={index} style={styles.symptomChip}>
                      <Text style={styles.symptomText}>{symptom}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Important Notes */}
        <View style={styles.notesCard}>
          <Text style={styles.notesTitle}>Important Notes</Text>
          <Text style={styles.notesText}>
            • Please arrive 10 minutes before your appointment time
          </Text>
          <Text style={styles.notesText}>
            • Bring your ID and insurance card (if applicable)
          </Text>
          <Text style={styles.notesText}>
            • You can cancel or reschedule up to 24 hours before
          </Text>
        </View>

        {/* Spacing for button */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* View My Bookings Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.viewBookingsButton}
          onPress={handleViewMyBookings}
        >
          <Text style={styles.viewBookingsButtonText}>View My Bookings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 48,
    color: '#fff',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  statusBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#F57C00',
    fontWeight: '600',
  },
  doctorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  doctorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  doctorInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  doctorSpecialty: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  doctorRating: {
    fontSize: 12,
    color: '#666',
  },
  locationSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  locationLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  locationCity: {
    fontSize: 14,
    color: '#666',
  },
  contactSection: {
    gap: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactLabel: {
    fontSize: 14,
    color: '#666',
    width: 60,
  },
  contactValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  reasonText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  symptomsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  symptomsLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  symptomChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  symptomText: {
    fontSize: 12,
    color: '#666',
  },
  notesCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 12,
  },
  notesText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
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
  viewBookingsButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewBookingsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
