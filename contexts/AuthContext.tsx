import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import SHA256 from 'crypto-js/sha256';
import { initBalance, getBalance, changeBalance } from '../lib/transaction_utils';
import { initStats } from '../lib/homepage_utils';
import { notifyWelcome } from '../lib/notifications';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  onboardingCompleted: boolean | null; // null = not checked yet, true/false = checked
  signUp: (email: string, password: string, username: string, age?: number | null, gender?: string | null, onboardingCompleted?: boolean, phoneNumber?: string | null, usedReferralCode?: string | null) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  deleteAccount: (userHash: string) => Promise<{ error: any }>;
  getUserProfile: () => Promise<{ username: string; email: string; hash: string; balance: number; gender?: string | null; referralCode?: string | null } | null>;
  checkOnboardingStatus: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  balanceRefreshTrigger: number; // Internal trigger for balance refresh
}

/**
 * Generate a unique 10-digit referral code
 */
function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate a unique referral code (checks database for uniqueness)
 */
async function generateUniqueReferralCode(): Promise<string> {
  let code = generateReferralCode();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    // Check if code already exists
    const { data } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('referral_code', code)
      .maybeSingle();

    if (!data) {
      // Code is unique
      return code;
    }

    // Generate a new code and try again
    code = generateReferralCode();
    attempts++;
  }

  // If we've exhausted attempts, add timestamp to ensure uniqueness
  return code + Date.now().toString().slice(-2);
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function sha256(input: string): string {
  return SHA256(input).toString();
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [balanceRefreshTrigger, setBalanceRefreshTrigger] = useState(0);

  const checkOnboardingStatus = async () => {
    if (!user) {
      setOnboardingCompleted(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !data) {
        setOnboardingCompleted(false);
        return;
      }

      setOnboardingCompleted(data.onboarding_completed === true);
    } catch (error) {
      setOnboardingCompleted(false);
    }
  };

  useEffect(() => {
    const checkStatusForUser = async (userId: string | undefined) => {
      if (!userId) {
        setOnboardingCompleted(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('user_id', userId)
          .maybeSingle();

        if (error || !data) {
          setOnboardingCompleted(false);
          return;
        }

        setOnboardingCompleted(data.onboarding_completed === true);
      } catch (error) {
        setOnboardingCompleted(false);
      }
    };

    // Handle session initialization with proper error handling
    const initializeSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          // If there's an error (e.g., invalid refresh token), clear the session
          console.log('Session error, clearing invalid session:', error.message);
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
          // Check onboarding status after session is loaded
          await checkStatusForUser(session?.user?.id);
        }
      } catch (error: any) {
        // Catch any unexpected errors and ensure we don't get stuck on loading screen
        console.error('Error initializing session:', error);
        // Clear any potentially invalid session
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          // Ignore sign out errors
        }
        setSession(null);
        setUser(null);
      } finally {
        // Always set loading to false, even if there was an error
        setLoading(false);
      }
    };

    initializeSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Check onboarding status when auth state changes
      await checkStatusForUser(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username: string, age?: number | null, gender?: string | null, onboardingCompleted: boolean = false, phoneNumber?: string | null, usedReferralCode?: string | null) => {
    try {
      setLoading(true);
      const normalizedEmail = email.toLowerCase();

      // If a referral code was provided, validate it exists and belongs to a different user
      let referrerHash: string | null = null;
      if (usedReferralCode && usedReferralCode.trim()) {
        const normalizedCode = usedReferralCode.toUpperCase().trim();
        const { data: referrerProfile, error: referrerError } = await supabase
          .from('profiles')
          .select('hash')
          .eq('referral_code', normalizedCode)
          .maybeSingle();
        
        if (referrerError) {
          console.error('Error checking referral code:', referrerError);
          return { error: { message: 'Failed to validate referral code. Please try again.' } };
        }
        
        if (!referrerProfile) {
          return { error: { message: 'Invalid referral code. Please check and try again.' } };
        }
        
        referrerHash = referrerProfile.hash;
        console.log('✅ Valid referral code found for hash:', referrerHash);
      }

      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });

      if (error) return { error };

      const userHash = sha256(normalizedEmail + username);

      // Prevent self-referral (safety check)
      if (referrerHash === userHash) {
        return { error: { message: 'You cannot use your own referral code.' } };
      }

      // Generate unique referral code for the new user
      const newUserReferralCode = await generateUniqueReferralCode();

      const { error: profileError } = await supabase.from('profiles').insert({
        email: normalizedEmail,
        username: username,
        hash: userHash,
        onboarding_completed: onboardingCompleted,
        gender: gender || null,
        age: age || null,
        phone_number: phoneNumber || null,
        referral_code: newUserReferralCode,
      });

      if (profileError) return { error: profileError };

      await initBalance(userHash);
      await initStats(userHash);

      // If valid referral code was used, give bonus token to both users
      if (referrerHash && referrerHash !== userHash) {
        // Give 1 token to the new user
        const newUserResult = await changeBalance(userHash, 1);
        if (newUserResult.ok) {
          console.log('✅ Gave 1 bonus token to new user for using referral code');
        } else {
          console.error('❌ Failed to give token to new user:', newUserResult.error);
        }
        
        // Give 1 token to the referrer
        const referrerResult = await changeBalance(referrerHash, 1);
        if (referrerResult.ok) {
          console.log('✅ Gave 1 bonus token to referrer');
        } else {
          console.error('❌ Failed to give token to referrer:', referrerResult.error);
        }
      }

      // Send welcome notification (don't await - fire and forget to not block signup)
      notifyWelcome(userHash).catch(err => 
        console.log('Non-critical: Failed to send welcome notification', err)
      );

      console.log('✅ User created with referral code:', newUserReferralCode);

      return { error: null };
    } catch (err) {
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });

      if (error) return { error };
      return { error: null };
    } catch (err) {
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async (userHash: string) => {
    try {
      setLoading(true);

      if (!user) {
        return { error: { message: 'No user logged in' } };
      }

      await supabase.from('hash_to_value').delete().eq('hash', userHash);
      await supabase.from('transactions').delete().eq('user_hash', userHash);
      await supabase.from('home_page_top').delete().eq('user_hash', userHash);
      await supabase.from('game_players').delete().eq('user_hash', userHash);
      await supabase.from('activity_log').delete().eq('user_hash', userHash);
      await supabase.from('proof_votes').delete().eq('voter_hash', userHash);

      const { error: profileError } = await supabase.from('profiles').delete().eq('hash', userHash);

      if (profileError) {
        return { error: profileError };
      }

      await supabase.auth.signOut();
      setUser(null);
      setSession(null);

      return { error: null };
    } catch (err) {
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const getUserProfile = async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, email, hash, gender, referral_code')
        .eq('email', user.email)
        .maybeSingle();

      if (error || !data) return null;

      const balance = await getBalance(data.hash);

      return { username: data.username, email: data.email, hash: data.hash, balance, gender: data.gender, referralCode: data.referral_code };
    } catch {
      return null;
    }
  };

  // Refresh balance - triggers a re-fetch in components that use getUserProfile
  const refreshBalance = async () => {
    // Trigger a state update that components can react to
    setBalanceRefreshTrigger(prev => prev + 1);
  };

  const value = {
    user,
    session,
    loading,
    onboardingCompleted,
    signUp,
    signIn,
    signOut,
    deleteAccount,
    getUserProfile,
    checkOnboardingStatus,
    refreshBalance,
    balanceRefreshTrigger,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
