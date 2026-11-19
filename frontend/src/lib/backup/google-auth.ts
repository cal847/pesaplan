/**
 * Connects to user's google account
 */
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

import { BackupError } from './errors';

const DRIVE_APPDATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

let configured = false;
function configure() {
  if (configured) return;
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    scopes: [DRIVE_APPDATA_SCOPE],
  });
  configured = true;
}

export type GoogleSession = { accessToken: string; email: string | null };

/** Shows Google's account picker, then returns an access token for the hidden Drive app folder. */
export async function pickGoogleAccount(): Promise<GoogleSession> {
  configure();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // forgetting the last account makes Google show the picker every time
    try {
      await GoogleSignin.signOut();
    } catch {
      /* nothing to sign out of */
    }

    // the result shape differs between library versions, so both are handled
    const response: any = await GoogleSignin.signIn();
    if (response?.type === 'cancelled') throw new BackupError('Cancelled', 'cancelled');
    const email: string | null = response?.data?.user?.email ?? response?.user?.email ?? null;

    const { accessToken } = await GoogleSignin.getTokens();
    if (!accessToken) throw new BackupError('Google did not return an access token.', 'auth');
    return { accessToken, email };
  } catch (e: any) {
    if (e instanceof BackupError) throw e;
    if (e?.code === statusCodes.SIGN_IN_CANCELLED) throw new BackupError('Cancelled', 'cancelled');
    if (e?.code === statusCodes.IN_PROGRESS) throw new BackupError('Google sign-in is already open.', 'unknown');
    if (e?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new BackupError("Google Play services aren't available on this phone.", 'config');
    }
    throw e;
  }
}

/** Called when Drive says the token expired. */
export async function refreshGoogleToken(oldToken: string): Promise<string> {
  await GoogleSignin.clearCachedAccessToken(oldToken);
  const { accessToken } = await GoogleSignin.getTokens();
  return accessToken;
}