import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { getToken } from '../lib/api';

export default function Index() {
  const router = useRouter();
  useEffect(() => {
    getToken().then((t) => router.replace(t ? '/home' : '/login'));
  }, [router]);
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color="#0d9488" />
    </View>
  );
}
