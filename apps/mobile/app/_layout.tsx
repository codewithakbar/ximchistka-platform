import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: '#0d9488' }, headerTintColor: '#fff' }}>
        <Stack.Screen name="index" options={{ title: 'CleanWay' }} />
        <Stack.Screen name="login" options={{ title: 'Kirish' }} />
        <Stack.Screen name="home" options={{ title: 'Bosh sahifa' }} />
        <Stack.Screen name="order" options={{ title: 'Buyurtma' }} />
        <Stack.Screen name="track" options={{ title: 'Kuzatish' }} />
        <Stack.Screen name="payment" options={{ title: "To'lov" }} />
      </Stack>
    </>
  );
}
