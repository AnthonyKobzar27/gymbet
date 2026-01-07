import { useCallback } from 'react';
import { Alert } from 'react-native';
import { challengeProof } from '@/lib/activity_log_utils';
import { triggerHaptic } from '@/lib/haptics';

export const useProofChallenge = (userHash: string | null) => {
  const handleChallenge = useCallback(
    async (proofId: string) => {
      if (!userHash) {
        triggerHaptic('error');
        Alert.alert('Error', 'Please log in to challenge a proof');
        return;
      }

      triggerHaptic('medium');

      Alert.alert(
        'Challenge Proof',
        'Are you sure you want to send this proof to the developers for review?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Challenge',
            style: 'destructive',
            onPress: async () => {
              try {
                const result = await challengeProof(parseInt(proofId), userHash);
                if (result.ok) {
                  triggerHaptic('success');
                  Alert.alert('Success', 'Your challenge has been submitted to the developers for review.');
                } else {
                  triggerHaptic('error');
                  Alert.alert('Error', result.error?.message || 'Failed to challenge proof');
                }
              } catch (error) {
                triggerHaptic('error');
                Alert.alert('Error', 'Failed to challenge proof');
              }
            },
          },
        ]
      );
    },
    [userHash]
  );

  return { handleChallenge };
};

