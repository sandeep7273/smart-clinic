/**
 * AppointmentListScreen
 * Displays list of all user appointments
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { AppointmentListScreenProps } from '../../navigation/types';
import { getPatientAppointments } from '../../api/appointment.api';
import { Appointment } from '../../types/appointment.types';
import { ErrorModal } from '../../components/ErrorModal';
import { getErrorMessage, getErrorTitle } from '../../utils/errorHandler';
import { useAuth } from '../../context/AuthContext';

export default function AppointmentListScreen({ navigation }: AppointmentListScreenProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
const { user } = useAuth();
  // Error modal state
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorTitle, setErrorTitle] = useState('Error');
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * Fetch user appointments
   */
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      console.log('Fetching appointments for user:', user);
      const response = await getPatientAppointments(user?.id || '', undefined, 20);
      
      if (response.success) {
        setAppointments(response.data);
      }
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
      setErrorTitle(getErrorTitle(error));
      setErrorMessage(getErrorMessage(error));
      setErrorModalVisible(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Load appointments on mount
   */
  useEffect(() => {
    fetchAppointments();
  }, []);

  /**
   * Handle refresh
   */
  const handleRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  /**
   * Get status badge color
   */
  const getStatusColor = (status: string): { bg: string; text: string } => {
    switch (status.toLowerCase()) {
      case 'pending':
        return { bg: '#FFF3E0', text: '#F57C00' };
      case 'confirmed':
        return { bg: '#E8F5E9', text: '#388E3C' };
      case 'cancelled':
        return { bg: '#FFEBEE', text: '#D32F2F' };
      case 'completed':
        return { bg: '#E3F2FD', text: '#1976D2' };
      case 'no_show':
        return { bg: '#F3E5F5', text: '#7B1FA2' };
      default:
        return { bg: '#F5F5F5', text: '#666' };
    }
  };

  /**
   * Handle appointment press
   */
  const handleAppointmentPress = (appointment: Appointment) => {
    Alert.alert(
      'Appointment Details',
      `Appointment #${appointment.appointmentNumber}\n\nDate: ${formatDate(appointment.date)}\nTime: ${appointment.startTime} - ${appointment.endTime}\nStatus: ${appointment.status}\n\nReason: ${appointment.reason}`,
      [{ text: 'OK' }]
    );
  };

  /**
   * Handle AI Chat Assistant button
   */
  const handleAIChatAssistant = () => {
    navigation.navigate('AISearch');
  };

  /**
   * Render appointment item
   */
  const renderAppointmentItem = ({ item }: { item: Appointment }) => {
    const statusColors = getStatusColor(item.status);

    return (
      <TouchableOpacity
        style={styles.appointmentCard}
        onPress={() => handleAppointmentPress(item)}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.appointmentNumber}>#{item.appointmentNumber}</Text>
            <Text style={styles.doctorName}>Dr. {item.doctor.name}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.statusText, { color: statusColors.text }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Date & Time */}
        <View style={styles.cardContent}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📅</Text>
            <Text style={styles.infoText}>{formatDate(item.date)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🕐</Text>
            <Text style={styles.infoText}>
              {item.startTime} - {item.endTime}
            </Text>
          </View>
          <View style={[styles.infoRow, styles.lastInfoRow]}>
            <Text style={styles.infoIcon}>📝</Text>
            <Text style={styles.infoText} numberOfLines={1}>
              {item.reason}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.createdDate}>
            Booked on {formatDate(item.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  /**
   * Render empty list
   */
  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📅</Text>
        <Text style={styles.emptyText}>No Appointments</Text>
        <Text style={styles.emptySubtext}>
          You haven't booked any appointments yet
        </Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate('DoctorList')}
        >
          <Text style={styles.browseButtonText}>Browse Doctors</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Appointments</Text>
        <View style={styles.backButton} />
      </View>

      {/* Appointments List */}
      {loading && appointments.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          renderItem={renderAppointmentItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#007AFF']}
              tintColor="#007AFF"
            />
          }
          ListEmptyComponent={renderEmpty}
        />
      )}

      {/* AI Chat Assistant Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.aiChatButton}
          onPress={handleAIChatAssistant}
        >
          <Text style={styles.aiChatIcon}>🤖</Text>
          <Text style={styles.aiChatButtonText}>AI Chat Assistant</Text>
        </TouchableOpacity>
      </View>

      {/* Error Modal */}
      <ErrorModal
        visible={errorModalVisible}
        title={errorTitle}
        message={errorMessage}
        onClose={() => setErrorModalVisible(false)}
        actionButtonText="Retry"
        onAction={fetchAppointments}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  appointmentNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardContent: {
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  lastInfoRow: {
    marginBottom: 0,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  cardFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  createdDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 400,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  aiChatButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiChatIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  aiChatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
