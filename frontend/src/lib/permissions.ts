export type PermissionId = 'sms' | 'notifications' | 'biometrics';
export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unavailable';
export type PermissionInfo = { id: PermissionId; state: PermissionState; canAskAgain: boolean };

export function pillLabel(id: PermissionId, state: PermissionState): string {
  if (id === 'biometrics') {
    return state === 'granted' ? 'Ready' : state === 'unavailable' ? 'Not available' : 'Not set up';
  }
  switch (state) {
    case 'granted': return 'Granted';
    case 'denied': return 'Off';
    case 'undetermined': return 'Not asked';
    case 'unavailable': return 'Not available';
  }
}

// Notifications and SMS send permission request directly.
export function tapAction(info: PermissionInfo): 'request' | 'settings' | 'authenticate' {
    if (info.id === 'biometrics') {
        return 'authenticate';
    }
    if ((info.id === 'sms' && info.state !== 'granted')){
        return 'request';
    }
    if (info.id === 'notifications' && info.state !== 'granted' && info.canAskAgain) {
      return 'request';
    }

    return 'settings';
}