import { StyleSheet } from 'react-native';

const COLORS = {
  primary: '#0066FF',
  primaryLight: '#4D94FF',
  error: '#FF3B30',
  errorLight: '#FFE5E5',
  success: '#34C759',
  successLight: '#E8F5E9',
  text: '#000000',
  textSecondary: '#666666',
  textLight: '#999999',
  border: '#E0E0E0',
  borderError: '#FF3B30',
  background: '#FFFFFF',
  backgroundLight: '#F5F5F5',
  white: '#FFFFFF',
};

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    backgroundColor: COLORS.white,
  },
  inputError: {
    borderColor: COLORS.borderError,
    borderWidth: 1.5,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  backContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  backText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  helpContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  helpText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  helpLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
