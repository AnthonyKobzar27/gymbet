import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

export const useProfileActions = (userHash: string | null) => {
  const { signOut, deleteAccount } = useAuth();

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  }, [signOut]);

  const handleDeleteAccount = useCallback(() => {
    if (!userHash) {
      Alert.alert('Error', 'Unable to delete account. User profile not found.');
      return;
    }

    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteAccount(userHash);
              if (result.error) {
                Alert.alert('Error', result.error.message || 'Failed to delete account.');
              } else {
                Alert.alert('Account Deleted', 'Your account has been successfully deleted.');
              }
            } catch {
              Alert.alert('Error', 'An unexpected error occurred.');
            }
          },
        },
      ]
    );
  }, [userHash, deleteAccount]);

  return {
    handleSignOut,
    handleDeleteAccount,
  };
};

