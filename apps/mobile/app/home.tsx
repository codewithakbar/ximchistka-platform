import { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { api, formatPrice } from '../lib/api';
import { ORDER_STATUS_LABELS, OrderStatus } from '@ximchistka/shared';

type Order = { id: string; orderNumber: string; status: OrderStatus; totalAmount: number };

export default function HomeScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    api<{ data: Order[] }>('/orders?limit=10').then((r) => setOrders(r.data)).catch(() => router.replace('/login'));
  }, [router]);

  return (
    <View style={styles.container}>
      <Button title="Yangi buyurtma" onPress={() => router.push('/order')} color="#0d9488" />
      <Button title="Kuzatish" onPress={() => router.push('/track')} />
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        style={{ marginTop: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.bold}>{item.orderNumber}</Text>
            <Text>{ORDER_STATUS_LABELS[item.status]}</Text>
            <Text>{formatPrice(item.totalAmount)}</Text>
            {item.status === 'ready' && (
              <Button title="To'lov" onPress={() => router.push({ pathname: '/payment', params: { orderId: item.id } })} />
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 8, elevation: 2 },
  bold: { fontWeight: '700' },
});
