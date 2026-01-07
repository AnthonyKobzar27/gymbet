import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { triggerHaptic } from '@/lib/haptics';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui',
});

interface ProfileActionsProps {
  signingOut: boolean;
  deletingAccount: boolean;
  onSignOut: () => void;
  onDeleteAccount: () => void;
}

export default function ProfileActions({
  signingOut,
  deletingAccount,
  onSignOut,
  onDeleteAccount,
}: ProfileActionsProps) {
  return (
    <>
      <TouchableOpacity
        style={styles.signOutButton}
        onPress={onSignOut}
        disabled={signingOut}
      >
        {signingOut ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Text style={styles.signOutButtonText}>SIGN OUT</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteAccountButton}
        onPress={() => {
          triggerHaptic('error');
          onDeleteAccount();
        }}
        disabled={deletingAccount}
      >
        {deletingAccount ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Text style={styles.deleteAccountButtonText}>DELETE ACCOUNT</Text>
        )}
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  signOutButton: {
    backgroundColor: '#000000',
    borderWidth: 4,
    borderColor: '#000000',
    paddingVertical: 18,
    marginBottom: 16,
    alignItems: 'center',
    borderRadius: 12,
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: fontFamily,
    fontWeight: '800',
    letterSpacing: 1,
  },
  deleteAccountButton: {
    backgroundColor: '#FF4444',
    borderWidth: 3,
    borderColor: '#FF4444',
    paddingVertical: 12,
    marginBottom: 24,
    alignItems: 'center',
    borderRadius: 12,
  },
  deleteAccountButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: fontFamily,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

