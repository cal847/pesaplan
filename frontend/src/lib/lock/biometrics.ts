/**
 * Handles biometric authentication (fingerprint, 3D face) for lock/unlock. This is separate from the PIN/password lock, and is only used to unlock the app if the user has set up a strong biometric on their phone.
 */
import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricStatus = 'ready' | 'weak_only' | 'not_enrolled' | 'unavailable';
export type BiometricOutcome = 'success' | 'cancelled' | 'lockout' | 'failed';

/** "ready" means a strong biometric (fingerprint or 3D face) is set up on this phone. */
export async function biometricStatus(): Promise<BiometricStatus> {
  try {
    if (!(await LocalAuthentication.hasHardwareAsync())) return 'unavailable';
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    if (level >= LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG) return 'ready';
    if (level === LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK) return 'weak_only';
    return 'not_enrolled';
  } catch {
    return 'unavailable';
  }
}

export async function promptBiometric(promptMessage: string): Promise<BiometricOutcome> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Use PIN or password',
      // the phone's own passcode must not be a way around ours
      disableDeviceFallback: true,
      // iOS: an empty label hides the "Enter Passcode" button
      fallbackLabel: '',
      // Android: fingerprint and 3D face only
      biometricsSecurityLevel: 'strong',
    });
    if (result.success) return 'success';
    if (result.error === 'lockout') return 'lockout';
    if (['user_cancel', 'system_cancel', 'app_cancel', 'user_fallback'].includes(result.error)) {
      return 'cancelled';
    }
    return 'failed';
  } catch {
    return 'failed';
  }
}