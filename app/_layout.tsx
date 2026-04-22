
import { useColorScheme } from '@/hooks/use-color-scheme';
import PlayerBar from '@/src/components/PlayerBar';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="album/[id]" />
        <Stack.Screen name="music/[id]" />
        <Stack.Screen name="purchases" />
      </Stack>
      <StatusBar style="auto" />
      <PlayerBar />
    </ThemeProvider>
  );
}

