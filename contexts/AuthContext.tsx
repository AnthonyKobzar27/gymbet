import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import SHA256 from 'crypto-js/sha256';
import { initBalance, getBalance } from '../lib/transaction_utils';
import { initStats } from '../lib/homepage_utils';
import { createNotification } from '../lib/notification_utils';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  onboardingCompleted: boolean | null; // null = not checked yet, true/false = checked
  signUp: (email: string, password: string, username: string, age?: number | null, gender?: string | null, onboardingCompleted?: boolean) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  deleteAccount: (userHash: string) => Promise<{ error: any }>;
  getUserProfile: () => Promise<{ username: string; email: string; hash: string; balance: number; gender?: string | null } | null>;
  checkOnboardingStatus: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  balanceRefreshTrigger: number; // Internal trigger for balance refresh
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

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Check onboarding status after session is loaded
      await checkStatusForUser(session?.user?.id);
    });

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

  const signUp = async (email: string, password: string, username: string, age?: number | null, gender?: string | null, onboardingCompleted: boolean = false) => {
    try {
      setLoading(true);
      const normalizedEmail = email.toLowerCase();

      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });

      if (error) return { error };

      const userHash = sha256(normalizedEmail + username);

      const { error: profileError } = await supabase.from('profiles').insert({
        email: normalizedEmail,
        username: username,
        hash: userHash,
        onboarding_completed: onboardingCompleted, // Set based on whether user came from onboarding
        gender: gender || null,
        age: age || null,
      });

      if (profileError) return { error: profileError };

      await initBalance(userHash);
      await initStats(userHash);

      // Send welcome notification
      await createNotification(
        userHash,
        'Welcome To Gymbets',
        'Thanks for joining Gymbets! Start by joining a game or creating your own. Good luck and stay consistent!',
        'welcome'
      );

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
        .select('username, email, hash, gender')
        .eq('email', user.email)
        .maybeSingle();

      if (error || !data) return null;

      const balance = await getBalance(data.hash);

      return { username: data.username, email: data.email, hash: data.hash, balance, gender: data.gender };
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
