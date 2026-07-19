/**
 * DoctorCard Component
 * Reusable card to display doctor information
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Doctor } from '../types/doctor.types';

interface DoctorCardProps {
  doctor: Doctor;
  onBook: (doctor: Doctor) => void;
  onPress?: (doctor: Doctor) => void;
}

export const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, onBook, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(doctor)}
      activeOpacity={0.7}>
      <View style={styles.cardContent}>
        {/* Doctor Info Row */}
        <View style={styles.doctorRow}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {doctor.firstName.charAt(0)}
              {doctor.lastName.charAt(0)}
            </Text>
          </View>

          {/* Doctor Details */}
          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>
              Dr. {doctor.firstName} {doctor.lastName}
            </Text>
            <Text style={styles.specialty}>
              {doctor.specializations[0] || 'General Practitioner'}
            </Text>
          </View>

          {/* Book Button */}
          <TouchableOpacity
            style={styles.bookButton}
            onPress={() => onBook(doctor)}
            activeOpacity={0.8}>
            <Text style={styles.bookButtonText}>Book</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardContent: {
    padding: 16,
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#666666',
    fontSize: 18,
    fontWeight: '600',
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  specialty: {
    fontSize: 14,
    color: '#666666',
  },
  bookButton: {
    backgroundColor: '#5A7FD8',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});