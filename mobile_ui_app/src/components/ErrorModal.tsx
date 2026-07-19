/**
 * ErrorModal Component
 * Custom modal for displaying user-friendly error messages
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';

interface ErrorModalProps {
  visible: boolean;
  title?: string;
  message: string;
  onClose: () => void;
  actionButtonText?: string;
  onAction?: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({
  visible,
  title = 'Error',
  message,
  onClose,
  actionButtonText,
  onAction,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Error Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          <ScrollView style={styles.messageContainer} showsVerticalScrollIndicator={false}>
            <Text style={styles.message}>{message}</Text>
          </ScrollView>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {actionButtonText && onAction && (
              <TouchableOpacity
                style={[styles.button, styles.actionButton]}
                onPress={() => {
                  onAction();
                  onClose();
                }}
              >
                <Text style={styles.actionButtonText}>{actionButtonText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, styles.closeButton]}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>
                {actionButtonText ? 'Cancel' : 'OK'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  errorIcon: {
    fontSize: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  messageContainer: {
    maxHeight: 200,
    marginBottom: 24,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButton: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#f0f0f0',
  },
  closeButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});
