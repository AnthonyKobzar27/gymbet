import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { Database } from '../lib/database.types';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Database['public']['Tables']['profiles']['Update']) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event);
      console.log('📱 Session:', session ? 'EXISTS' : 'NULL');
      console.log('👤 User:', session?.user ? session.user.email : 'NULL');
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log('🔍 Loading profile for user:', session.user.id);
        await loadProfile(session.user.id);
      } else {
        console.log('🚫 No session, clearing profile');
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, try to create it
        console.log('Profile not found, attempting to create...');
        await createMissingProfile(userId);
      } else if (error) {
        console.error('Error loading profile:', error);
        setProfile(null);
      } else {
        setProfile(data);
        // Cache profile for offline access
        await AsyncStorage.setItem('user_profile', JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error in loadProfile:', error);
      // Try to load cached profile
      try {
        const cached = await AsyncStorage.getItem('user_profile');
        if (cached) {
          setProfile(JSON.parse(cached));
        }
      } catch (cacheError) {
        console.error('Error loading cached profile:', cacheError);
      }
    } finally {
      setLoading(false);
    }
  };

  const createMissingProfile = async (userId: string) => {
    try {
      // Get user email from auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const username = user.email?.split('@')[0] || `user_${userId.slice(0, 8)}`;
      
      const profileData: Database['public']['Tables']['profiles']['Insert'] = {
        id: userId,
        username: username.toLowerCase(),
        display_name: username,
        email_verified: false,
        total_games_played: 0,
        total_games_won: 0,
        total_winnings: 0,
        current_streak: 0,
        longest_streak: 0,
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert(profileData as any)
        .select()
        .single();

      if (error) {
        console.error('Error creating missing profile:', error);
        setProfile(null);
      } else {
        setProfile(data);
        
        // Also create wallet
        const walletData: Database['public']['Tables']['wallets']['Insert'] = {
          user_id: userId,
          balance_cents: 0,
        };

        const { error: walletError } = await supabase
          .from('wallets')
          .insert(walletData as any);

        if (walletError) {
          console.error('Error creating wallet for existing user:', walletError);
        }
      }
    } catch (error) {
      console.error('Error in createMissingProfile:', error);
      setProfile(null);
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      setLoading(true);
      
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.toLowerCase())
        .single();

      if (existingUser) {
        return { error: { message: 'Username already taken' } };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.toLowerCase(),
          }
        }
      });

      if (error) return { error };

      if (data.user && !error) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const profileData: Database['public']['Tables']['profiles']['Insert'] = {
          id: data.user.id,
          username: username.toLowerCase(),
          display_name: username,
          email_verified: false,
          total_games_played: 0,
          total_games_won: 0,
          total_winnings: 0,
          current_streak: 0,
          longest_streak: 0,
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .insert(profileData as any);

        if (profileError) {
          console.error('Error creating profile:', profileError);
          console.warn('Profile creation failed, but signup was successful. Profile will be created on next login.');
        } else {
          const walletData: Database['public']['Tables']['wallets']['Insert'] = {
            user_id: data.user.id,
            balance_cents: 0,
          };

          const { error: walletError } = await supabase
            .from('wallets')
            .insert(walletData as any);

          if (walletError) {
            console.error('Error creating wallet:', walletError);
          }
        }
      }

      return { error: null };
    } catch (error) {
      console.error('Signup error:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('🔐 Attempting to sign in with:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('❌ Sign in error:', error);
        return { error };
      }
      
      if (data.user) {
        console.log('✅ Sign in successful for user:', data.user.id);
        console.log('📧 Email confirmed:', data.user.email_confirmed_at);
        console.log('👤 User metadata:', data.user.user_metadata);
      }
      
      return { error: null };
    } catch (error) {
      console.error('💥 Signin exception:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      await AsyncStorage.removeItem('user_profile');
      setProfile(null);
    } catch (error) {
      console.error('Signout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Database['public']['Tables']['profiles']['Update']) => {
    if (!user) return { error: { message: 'Not authenticated' } };

    try {
      const { data, error } = await (supabase
        .from('profiles') as any)
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) return { error };

      setProfile(data);
      await AsyncStorage.setItem('user_profile', JSON.stringify(data));
      return { error: null };
    } catch (error) {
      console.error('Update profile error:', error);
      return { error };
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
