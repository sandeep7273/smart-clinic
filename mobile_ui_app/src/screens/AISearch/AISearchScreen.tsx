import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { AISearchScreenProps } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { 
  aiChatApi, 
  ChatMessage, 
  ActionType, 
  DoctorInfo, 
  AppointmentInfo,
  SearchDoctorPayload,
  ShowAppointmentsPayload 
} from '../../api/ai.api';

interface DisplayMessage extends ChatMessage {
  actionType?: ActionType;
  payload?: SearchDoctorPayload | ShowAppointmentsPayload | any;
  disclaimer?: string;
}

export default function AISearchScreen({ navigation }: AISearchScreenProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load conversation history on mount
  useEffect(() => {
    // Show welcome message immediately
    setMessages([
      {
        id: 'welcome',
        userId: 'system',
        role: 'assistant',
        content: 'Hello! I\'m your AI health assistant. How can I help you today?\n\nYou can:\n• Ask about symptoms\n• Search for doctors\n• View your appointments\n• Book appointments',
        timestamp: new Date().toISOString(),
      },
    ]);
    
    // Load conversation history in background
    loadConversationHistory();
  }, []);

  const loadConversationHistory = async () => {
    if (!user?.id) {
      setIsLoadingHistory(false);
      return;
    }

    try {
      const context = await aiChatApi.getConversationContext(user.id);
      if (context?.messages && context.messages.length > 0) {
        // Only replace welcome message if we have actual conversation history
        setMessages(context.messages);
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
      // Keep welcome message on error
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const sendMessage = async () => {
    console.log('Sending message:', inputText, 'User ID:', user);
    if (!inputText.trim() || !user?.id) return;

    const userMessage: DisplayMessage = {
      id: `user-${Date.now()}`,
      userId: user.id,
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const result = await aiChatApi.sendMessage(user.id, userMessage.content);
      console.log('AI response:', result);

      if (result.success && result.data) {
        const assistantMessage: DisplayMessage = {
          id: `assistant-${Date.now()}`,
          userId: 'assistant',
          role: 'assistant',
          content: result.data.message,
          timestamp: new Date().toISOString(),
          actionType: result.data.actionType,
          payload: result.data.payload,
          disclaimer: result.data.disclaimer,
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        // Scroll to bottom after a short delay
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        throw new Error(result.message || 'Failed to get response');
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      
      // Add error message
      const errorMessage: DisplayMessage = {
        id: `error-${Date.now()}`,
        userId: 'system',
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionButton = (actionType: ActionType, payload: any) => {
    switch (actionType) {
      case ActionType.SEARCH_DOCTOR:
        if (payload?.specialization) {
          navigation.navigate('DoctorList', { 
            specialization: payload.specialization 
          });
        } else {
          navigation.navigate('DoctorList', {});
        }
        break;
      
      case ActionType.SHOW_APPOINTMENTS:
        navigation.navigate('AppointmentList');
        break;
      
      case ActionType.BOOK_APPOINTMENT:
        if (payload?.specialization) {
          navigation.navigate('DoctorList', { 
            specialization: payload.specialization 
          });
        } else {
          navigation.navigate('DoctorList', {});
        }
        break;
      
      default:
        break;
    }
  };

  const clearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear the conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            if (user?.id) {
              try {
                await aiChatApi.clearContext(user.id);
                setMessages([]);
                loadConversationHistory();
              } catch (error) {
                Alert.alert('Error', 'Failed to clear chat');
              }
            }
          },
        },
      ]
    );
  };

  const renderDoctorCard = (doctor: DoctorInfo) => {
    // Build location string safely
    const locationParts: string[] = [];
    if (doctor.street && typeof doctor.street === 'string') locationParts.push(doctor.street);
    if (doctor.city && typeof doctor.city === 'string') locationParts.push(doctor.city);
    if (doctor.state && typeof doctor.state === 'string') locationParts.push(doctor.state);
    const locationStr = locationParts.join(', ');

    // Ensure all values are strings or numbers
    const doctorName = doctor.name && typeof doctor.name === 'string' ? doctor.name : 'Unknown Doctor';
    const doctorSpec = doctor.specialization && typeof doctor.specialization === 'string' ? doctor.specialization : 'General Practitioner';
    const doctorRating = typeof doctor.rating === 'number' ? doctor.rating : 0;
    const doctorExp = typeof doctor.experience === 'number' ? doctor.experience : 0;
    const doctorFee = typeof doctor.consultationFee === 'number' ? doctor.consultationFee : 0;
    const doctorLangs = Array.isArray(doctor.languages) ? doctor.languages.filter(l => typeof l === 'string') : [];

    return (
      <View key={doctor.id} style={styles.infoCard}>
        <Text style={styles.cardTitle}>{doctorName}</Text>
        <Text style={styles.cardSubtitle}>{doctorSpec}</Text>
        {doctorRating > 0 && (
          <Text style={styles.cardDetail}>⭐ {doctorRating.toFixed(1)}</Text>
        )}
        {doctorExp > 0 && (
          <Text style={styles.cardDetail}>📅 {doctorExp} years experience</Text>
        )}
        {doctorFee > 0 && (
          <Text style={styles.cardDetail}>💰 ₹{doctorFee} consultation fee</Text>
        )}
        {locationStr.length > 0 && (
          <Text style={styles.cardDetail}>📍 {locationStr}</Text>
        )}
        {doctorLangs.length > 0 && (
          <Text style={styles.cardDetail}>🗣️ {doctorLangs.join(', ')}</Text>
        )}
      </View>
    );
  };

  const renderAppointmentCard = (appointment: AppointmentInfo) => {
    const formatDate = (dateStr: string) => {
      try {
        if (!dateStr) return 'Date not available';
        return new Date(dateStr).toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      } catch {
        return dateStr || 'Date not available';
      }
    };

    const formatTime = (timeStr: string) => {
      try {
        if (!timeStr) return '';
        // Handle HH:MM:SS or HH:MM format
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
      } catch {
        return timeStr || '';
      }
    };

    const getStatusColor = (status: string) => {
      switch (status?.toLowerCase()) {
        case 'confirmed':
        case 'scheduled':
          return '#4CAF50';
        case 'pending':
          return '#FF9500';
        case 'cancelled':
          return '#F44336';
        case 'completed':
          return '#2196F3';
        default:
          return '#666';
      }
    };

    // Extract safe values
    const doctorName = appointment.doctorName && typeof appointment.doctorName === 'string' 
      ? appointment.doctorName 
      : 'Unknown Doctor';
    const specialization = appointment.specialization && typeof appointment.specialization === 'string'
      ? appointment.specialization
      : '';
    const status = appointment.status && typeof appointment.status === 'string'
      ? appointment.status
      : 'unknown';
    const appointmentType = appointment.type && typeof appointment.type === 'string'
      ? appointment.type
      : '';
    
    // Build location string safely
    const locationParts: string[] = [];
    if (appointment.city && typeof appointment.city === 'string') locationParts.push(appointment.city);
    if (appointment.state && typeof appointment.state === 'string') locationParts.push(appointment.state);
    const locationStr = locationParts.join(', ');

    const formattedDate = formatDate(appointment.date || '');
    const formattedStartTime = formatTime(appointment.startTime || '');
    const formattedEndTime = formatTime(appointment.endTime || '');

    return (
      <View key={appointment.id} style={styles.infoCard}>
        <View style={styles.appointmentHeader}>
          <Text style={styles.cardTitle}>{doctorName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        </View>
        {specialization.length > 0 && (
          <Text style={styles.cardSubtitle}>{specialization}</Text>
        )}
        <Text style={styles.cardDetail}>📅 {formattedDate}</Text>
        {formattedStartTime && formattedEndTime && (
          <Text style={styles.cardDetail}>
            🕐 {formattedStartTime} - {formattedEndTime}
          </Text>
        )}
        {locationStr.length > 0 && (
          <Text style={styles.cardDetail}>
            📍 {locationStr}
          </Text>
        )}
        {appointmentType.length > 0 && (
          <Text style={styles.cardDetail}>📋 {appointmentType}</Text>
        )}
      </View>
    );
  };

  const renderMessage = (message: DisplayMessage) => {
    const isUser = message.role === 'user';

    // Log payload for debugging
    if (!isUser && message.payload) {
      console.log('AI Message Payload:', JSON.stringify(message.payload, null, 2));
    }

    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
        ]}>
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}>
          {!isUser && (
            <Text style={styles.assistantLabel}>🤖 AI Assistant</Text>
          )}
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userMessageText : styles.assistantMessageText,
            ]}>
            {message.content}
          </Text>
          
          {message.disclaimer && (
            <Text style={styles.disclaimer}>⚠️ {message.disclaimer}</Text>
          )}

          {/* Render doctor cards if available */}
          {!isUser && message.payload && 'doctors' in message.payload && message.payload.doctors && message.payload.doctors.length > 0 && (
            <View style={styles.cardsContainer}>
              {message.payload.doctors.map((doctor: DoctorInfo) => renderDoctorCard(doctor))}
            </View>
          )}

          {/* Render appointment cards if available */}
          {!isUser && message.payload && 'appointments' in message.payload && message.payload.appointments && message.payload.appointments.length > 0 && (
            <View style={styles.cardsContainer}>
              {message.payload.appointments.map((appointment: AppointmentInfo) => renderAppointmentCard(appointment))}
            </View>
          )}

          {message.actionType && message.actionType !== ActionType.NONE && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleActionButton(message.actionType!, message.payload)}>
              <Text style={styles.actionButtonText}>
                {message.actionType === ActionType.SEARCH_DOCTOR && '🔍 Search Doctors'}
                {message.actionType === ActionType.SHOW_APPOINTMENTS && '📅 View Appointments'}
                {message.actionType === ActionType.BOOK_APPOINTMENT && '📝 Book Appointment'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.timestamp}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.headerText}>AI Health Assistant</Text>
          <Text style={styles.headerSubtext}>Ask me anything about your health</Text>
        </View>
        <TouchableOpacity onPress={clearChat} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}>
        {messages.map(renderMessage)}
        {isLoading && (
          <View style={styles.typingIndicator}>
            <View style={styles.typingBubble}>
              <Text style={styles.typingText}>AI is typing...</Text>
              <ActivityIndicator size="small" color="#007AFF" />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type your message..."
          placeholderTextColor="#999"
          multiline
          maxLength={1000}
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isLoading}>
          <Text style={styles.sendButtonText}>
            {isLoading ? '⏳' : '📤'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    paddingTop: 50,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    fontSize: 28,
    color: '#007AFF',
  },
  headerTitle: {
    flex: 1,
    marginLeft: 10,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  clearButton: {
    padding: 5,
  },
  clearButtonText: {
    fontSize: 22,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 15,
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 15,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  assistantMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  assistantLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    fontWeight: '600',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  assistantMessageText: {
    color: '#333',
  },
  disclaimer: {
    fontSize: 12,
    color: '#FF9500',
    marginTop: 8,
    fontStyle: 'italic',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  typingIndicator: {
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderBottomLeftRadius: 4,
  },
  typingText: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
    marginRight: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CCC',
  },
  sendButtonText: {
    fontSize: 20,
  },
  cardsContainer: {
    marginTop: 12,
  },
  infoCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  cardDetail: {
    fontSize: 13,
    color: '#555',
    marginBottom: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
