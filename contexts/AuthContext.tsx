import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import SHA256 from "crypto-js/sha256";
import { initBalance, changeBalance, getBalance, deposit, withdraw } from '../lib/transaction_utils';
import { initStats } from '../lib/homepage_utils';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, username : string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  deleteAccount: (userHash: string) => Promise<{ error: any }>;
  getUserProfile: () => Promise<{ username: string; email: string; hash: string, balance: number } | null>;
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    try {
      setLoading(true);
      const normalizedEmail = email.toLowerCase();

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });

      if (error) return { error };

      const userHash = sha256(normalizedEmail + username);

      const {error: profileError} = await supabase.from('profiles').insert({
        email: normalizedEmail,
        username: username,
        hash: userHash,
      })

      if (profileError) return { error: profileError };

      await initBalance(userHash);
      await initStats(userHash);

      console.log('✅ Signup successful. Check your email for verification.');
      return { error: null };
    } catch (err) {
      console.error('Sign up error:', err);
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });

      if (error) return { error };

      console.log('✅ Sign in successful');
      return { error: null };
    } catch (err) {
      console.error('Sign in error:', err);
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
    } catch (err) {
      console.error('Sign out error:', err);
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

      // Delete all user-related data by hash
      // Note: Records with user_id will be cascade deleted when auth user is deleted
      
      // Delete from hash_to_value (balance)
      const { error: balanceError } = await supabase
        .from('hash_to_value')
        .delete()
        .eq('hash', userHash);

      if (balanceError) {
        console.error('Error deleting balance:', balanceError);
      }

      // Delete from transactions
      const { error: transactionsError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_hash', userHash);

      if (transactionsError) {
        console.error('Error deleting transactions:', transactionsError);
      }

      // Delete from home_page_top
      const { error: statsError } = await supabase
        .from('home_page_top')
        .delete()
        .eq('user_hash', userHash);

      if (statsError) {
        console.error('Error deleting stats:', statsError);
      }

      // Delete from game_players
      const { error: gamePlayersError } = await supabase
        .from('game_players')
        .delete()
        .eq('user_hash', userHash);

      if (gamePlayersError) {
        console.error('Error deleting game players:', gamePlayersError);
      }

      // Delete from activity_log
      const { error: activityLogError } = await supabase
        .from('activity_log')
        .delete()
        .eq('user_hash', userHash);

      if (activityLogError) {
        console.error('Error deleting activity log:', activityLogError);
      }

      // Delete from proof_votes
      const { error: proofVotesError } = await supabase
        .from('proof_votes')
        .delete()
        .eq('voter_hash', userHash);

      if (proofVotesError) {
        console.error('Error deleting proof votes:', proofVotesError);
      }

      // Delete profile record by hash (this should be last)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('hash', userHash);

      if (profileError) {
        console.error('Error deleting profile:', profileError);
        return { error: profileError };
      }

      // Note: Auth user deletion requires server-side admin access
      // The profile and all user data have been deleted
      // The auth user record will remain but won't have any associated data
      // In production, you may want to create an edge function to delete the auth user

      // Sign out after successful deletion
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);

      console.log('✅ Account deleted successfully');
      return { error: null };
    } catch (err) {
      console.error('Delete account error:', err);
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
        .select('username, email, hash')
        .eq('email', user.email)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      if (!data) {
        console.error('No profile found for user:', user.email);
        return null;
      }

      const balance = await getBalance(data.hash);

      return {username: data.username, email: data.email, hash: data.hash, balance: balance};
    } catch (err) {
      console.error('Error fetching user profile:', err);
      return null;
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    deleteAccount,
    getUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
