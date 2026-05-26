import { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../lib/api';

type Branch = { id: string; name: string };
type Price = { serviceId: string; price: number; service: { name: string } };

export default function OrderScreen() {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [prices, setPrices] = useState<Price[]>([]);

  useEffect(() => {
    api<Branch[]>('/branches').then(setBranches);
  }, []);

  useEffect(() => {
    if (branchId) api<Price[]>(`/services/prices/${branchId}`).then(setPrices);
  }, [branchId]);

  async function submit() {
    if (!branchId || !prices[0]) return;
    try {
      await api('/orders', {
        method: 'POST',
        body: JSON.stringify({
          branchId,
          items: [{ serviceId: prices[0].serviceId, quantity: 1 }],
          deliveryType: 'pickup',
          address: 'Mobil buyurtma',
        }),
      });
      Alert.alert('Muvaffaqiyat', 'Buyurtma yuborildi');
      router.replace('/home');
    } catch {
      Alert.alert('Xatolik');
    }
  }

  return (
    <View style={styles.container}>
      {branches.map((b) => (
        <Button
          key={b.id}
          title={b.name}
          onPress={() => setBranchId(b.id)}
          color={branchId === b.id ? '#0d9488' : '#94a3b8'}
        />
      ))}
      {prices[0] && <Text style={{ marginVertical: 12 }}>{prices[0].service.name}</Text>}
      <Button title="Yuborish" onPress={submit} color="#0d9488" />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, padding: 16 } });
