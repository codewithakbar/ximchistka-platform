import { useLocalSearchParams } from 'expo-router';
import { View, Text, Button, StyleSheet, Alert, Linking } from 'react-native';
import { api } from '../lib/api';

export default function PaymentScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  async function pay(provider: 'click' | 'payme' | 'cash') {
    try {
      const res = await api<{ redirectUrl?: string }>(`/payments/orders/${orderId}/initiate`, {
        method: 'POST',
        body: JSON.stringify({ provider }),
      });
      if (res.redirectUrl) await Linking.openURL(res.redirectUrl);
      else Alert.alert('To\'lov qabul qilindi');
    } catch {
      Alert.alert('Xatolik');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>To&apos;lov usuli</Text>
      <Button title="Click" onPress={() => pay('click')} color="#0d9488" />
      <Button title="Payme" onPress={() => pay('payme')} />
      <Button title="Naqd" onPress={() => pay('cash')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 16 },
});
