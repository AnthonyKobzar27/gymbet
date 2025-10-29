import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { supabase } from './lib/supabase';

export default function DebugAuth() {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');

  const testSignUp = async () => {
    console.log('🧪 Testing signup...');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    console.log('Signup result:', { data, error });
    Alert.alert('Signup Result', JSON.stringify({ data: data?.user?.email, error: error?.message }));
  };

  const testSignIn = async () => {
    console.log('🧪 Testing signin...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    console.log('Signin result:', { data, error });
    Alert.alert('Signin Result', JSON.stringify({ data: data?.user?.email, error: error?.message }));
  };

  const testGetUser = async () => {
    console.log('🧪 Testing get user...');
    const { data, error } = await supabase.auth.getUser();
    
    console.log('Get user result:', { data, error });
    Alert.alert('Get User Result', JSON.stringify({ data: data?.user?.email, error: error?.message }));
  };

  const testSignOut = async () => {
    console.log('🧪 Testing signout...');
    const { error } = await supabase.auth.signOut();
    
    console.log('Signout result:', { error });
    Alert.alert('Signout Result', JSON.stringify({ error: error?.message }));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Auth Debug</Text>
      
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
      />
      
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
      />
      
      <TouchableOpacity style={styles.button} onPress={testSignUp}>
        <Text style={styles.buttonText}>Test Sign Up</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={testSignIn}>
        <Text style={styles.buttonText}>Test Sign In</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={testGetUser}>
        <Text style={styles.buttonText}>Test Get User</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={testSignOut}>
        <Text style={styles.buttonText}>Test Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
