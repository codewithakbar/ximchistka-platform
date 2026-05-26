import { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
import { api } from '../lib/api';
import { ORDER_STATUS_LABELS, OrderStatus } from '@ximchistka/shared';

export default function TrackScreen() {
  const [num, setNum] = useState('XC-10001');
  const [status, setStatus] = useState('');

  async function track() {
    const o = await api<{ status: OrderStatus }>(`/orders/track/${num}`);
    setStatus(ORDER_STATUS_LABELS[o.status]);
  }

  return (
    <View style={styles.container}>
      <TextInput style={styles.input} value={num} onChangeText={setNum} />
      <Button title="Kuzatish" onPress={track} color="#0d9488" />
      {status ? <Text style={styles.result}>{status}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12 },
  result: { marginTop: 24, fontSize: 20, fontWeight: '600', color: '#0d9488' },
});
