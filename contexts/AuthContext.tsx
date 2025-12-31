import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import SHA256 from 'crypto-js/sha256';
import { initBalance, getBalance } from '../lib/transaction_utils';
import { initStats } from '../lib/homepage_utils';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  deleteAccount: (userHash: string) => Promise<{ error: any }>;
  getUserProfile: () => Promise<{ username: string; email: string; hash: string; balance: number } | null>;
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
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
      });

      if (profileError) return { error: profileError };

      await initBalance(userHash);
      await initStats(userHash);

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
        .select('username, email, hash')
        .eq('email', user.email)
        .maybeSingle();

      if (error || !data) return null;

      const balance = await getBalance(data.hash);

      return { username: data.username, email: data.email, hash: data.hash, balance };
    } catch {
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
