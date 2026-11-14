import { useColorScheme } from 'react-native';
import { PAGE_BACKGROUND } from '@/constants/colors';

const LIGHT = {
  background: PAGE_BACKGROUND,
  card: '#FFFFFF',
  text: '#1A1A1A',
  subtext: '#888888',
  divider: '#EEECF6',
  accent: '#3F2FD6',
  accentSoft: '#EDE9FF',
  success: '#1FA64A',
};

const DARK: typeof LIGHT = {
  background: '#121018',
  card: '#1E1B2B',
  text: '#F2F0FA',
  subtext: '#9B97B0',
  divider: '#2D2A40',
  accent: '#9B8CFF',
  accentSoft: '#2B2547',
  success: '#4CD27A',
};

export function usePalette() {
  return useColorScheme() === 'dark' ? DARK : LIGHT;
}