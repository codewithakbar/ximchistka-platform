import { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { api, saveAuth } from '../lib/api';

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('+998904444444');
  const [code, setCode] = useState('123456');

  async function login() {
    try {
      await api('/auth/otp/request', { method: 'POST', body: JSON.stringify({ phone }) });
      const data = await api<{ accessToken: string; refreshToken: string }>('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, code }),
      });
      await saveAuth(data);
      router.replace('/home');
    } catch {
      Alert.alert('Xatolik', 'Kirish amalga oshmadi');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ximchistka</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Telefon" />
      <TextInput style={styles.input} value={code} onChangeText={setCode} placeholder="OTP kod" />
      <Button title="Kirish" onPress={login} color="#0d9488" />
      <Text style={styles.hint}>Dev OTP: 123456</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#0d9488', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: '#99f6e4', borderRadius: 12, padding: 12, marginBottom: 12 },
  hint: { marginTop: 16, color: '#64748b', textAlign: 'center' },
});
