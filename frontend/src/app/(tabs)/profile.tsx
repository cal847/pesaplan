import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LockSettings } from '@/components/lock/lock-settings';
import { BackupSection } from '@/components/profile/backup-section';
import { DisclosureRow, ROW_GUTTER } from '@/components/profile/disclosure-row';
import { DonateNumber } from '@/components/profile/donate-number';
import { ExportModal } from '@/components/profile/export-modal';
import { ImportPasteModal } from '@/components/profile/import-paste-modal';
import { DropdownPicker } from '@/components/shared/dropdown-picker';
import { usePermissions } from '@/hooks/use-permissions';
import { PermissionId, pillLabel, tapAction } from '@/lib/permissions';
import { ThemePreference, useSettingsStore } from '@/stores/settings-store';

const COLORS = {
  background: '#F0EFF5',
  card: '#FFFFFF',
  text: '#07022A',
  subtext: '#666666',
  accent: '#3F2FD6',
  accentSoft: '#EEEBFF',
  divider: '#E5E3F0',
  success: '#1FA64A',
  successSoft: '#E3F6E8',
  neutralPill: '#EFEFEF',
};

const USER = {
  name: 'User Name',
  email: 'user@example.com',
};

const INITIALS = USER.name
  .split(' ')
  .map((word) => word[0])
  .slice(0, 2)
  .join('')
  .toUpperCase();

const PERMISSION_META: {
  id: PermissionId;
  icon: keyof typeof Ionicons.glyphMap;
  name: string;
  description: string;
}[] = [
  { id: 'sms', icon: 'chatbubble-ellipses-outline', name: 'SMS', description: 'Read M-Pesa messages to import transactions' },
  { id: 'notifications', icon: 'notifications-outline', name: 'Notifications', description: 'Budget alerts and bill reminders' },
  { id: 'biometrics', icon: 'finger-print-outline', name: 'Biometrics', description: 'Fingerprint or face unlock on this device' },
];

const THEME_LABELS: Record<ThemePreference, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System default',
};

const THEME_OPTIONS = Object.values(THEME_LABELS);

function labelToTheme(label: string): ThemePreference {
  const keys = Object.keys(THEME_LABELS) as ThemePreference[];

  return keys.find((key) => THEME_LABELS[key] === label) ?? 'system';
}

function Divider() {
  return <View style={styles.divider} />;
}

export default function ProfileScreen() {
  const themePreference = useSettingsStore((state) => state.themePreference);
  const setThemePreference = useSettingsStore(
    (state) => state.setThemePreference
  );
  const [pasteOpen, setPasteOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const { items, request } = usePermissions();

  async function onPermissionPress(id: PermissionId) {
    const info = items?.find((p) => p.id === id);
    console.log('[Profile permission] tapped', { id, info });

    if (!info) {
      console.log('[Profile permission] permission state is not loaded');
      return;
    }

    const action = tapAction(info);
    console.log('[Profile permission] action', action);

    if (action === 'request') {
      console.log('[Profile permission] calling request', id);
      const result = await request(id);
      console.log('[Profile permission] request returned', { id, result });
    } else {
      console.log('[Profile permission] opening app settings', id);
      await Linking.openSettings();
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>{INITIALS}</Text>
          </View>

          <Text style={styles.name}>{USER.name}</Text>
          <Text style={styles.email}>{USER.email}</Text>
        </View>

        <View style={styles.card}>
          {/* App lock */}
          <LockSettings />

          <View style={styles.row}>
            <View style={styles.gutter}>
              <Ionicons
                name="color-palette-outline"
                size={18}
                color={COLORS.accent}
              />
            </View>

            <Text style={[styles.rowLabel, styles.rowText]}>Theme</Text>

            <View style={styles.themePicker}>
              <DropdownPicker
                label="Theme"
                options={THEME_OPTIONS}
                selected={THEME_LABELS[themePreference]}
                onSelect={(label) => setThemePreference(labelToTheme(label))}
                triggerTextStyle={styles.themeTriggerText}
                iconColor={COLORS.subtext}
              />
            </View>
          </View>
          <Divider />
          
          <DisclosureRow label="Import" icon="download-outline" iconColor={COLORS.accent} labelStyle={styles.rowLabel}>
            <Pressable style={styles.option} onPress={() => setPasteOpen(true)}>
              <Ionicons name="clipboard-outline" size={18} color={COLORS.accent} />
              <Text style={styles.optionLabel}>Paste messages</Text>
            </Pressable>

            <View style={[styles.option, styles.optionDisabled]}>
              <Ionicons name="document-outline" size={18} color={COLORS.subtext} />
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, { color: COLORS.subtext }]}>Import statement (PDF)</Text>
                <Text style={styles.rowHint}>Safaricom's password-protected statement</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: COLORS.neutralPill }]}>
                <Text style={[styles.pillText, { color: COLORS.subtext }]}>Soon</Text>
              </View>
            </View>
          </DisclosureRow>
          <Divider />          

          <Pressable style={styles.row} onPress={() => setExportOpen(true)}>
            <View style={styles.gutter}>
              <Ionicons name="share-outline" size={18} color={COLORS.accent} />
            </View>
            <Text style={[styles.rowLabel, styles.rowText]}>Export</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.subtext} />
          </Pressable>
          <Divider />


          <DisclosureRow label="Backup" icon='cloud-outline' labelStyle={styles.rowLabel}>
            <BackupSection />
          </DisclosureRow>

          <Divider />
          <DisclosureRow label="Donate" icon='heart' labelStyle={styles.rowLabel}>
            <Text style={styles.rowHint}>
              Support the development of PesaPlan.
            </Text>
            <DonateNumber/>

            <Pressable
              style={styles.option}
              onPress={() => {
                // TODO: open the donation flow
              }}
            >
              <Ionicons
                name="phone-portrait-outline"
                size={18}
                color={COLORS.accent}
              />
              <Text style={styles.optionLabel}>Donate via M-Pesa</Text>
            </Pressable>
          </DisclosureRow>
        </View>

        <Text style={styles.sectionLabel}>Permissions</Text>

        <View style={styles.card}>
          {PERMISSION_META.map((meta, index) => {
            const info = items?.find((p) => p.id === meta.id);
            const granted = info?.state === 'granted';
            return (
              <View key={meta.id}>
                {index > 0 && <Divider />}
                <Pressable style={styles.row} onPress={() => onPermissionPress(meta.id)}>
                  <View style={styles.gutter}>
                    <Ionicons name={meta.icon} size={18} color={COLORS.accent} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabel}>{meta.name}</Text>
                    <Text style={styles.rowHint}>{meta.description}</Text>
                  </View>
                  {info && (
                    <View style={[styles.pill, { backgroundColor: granted ? COLORS.successSoft : COLORS.neutralPill }]}>
                      <Text style={[styles.pillText, { color: granted ? COLORS.success : COLORS.subtext }]}>
                        {pillLabel(meta.id, info.state)}
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>
      <ImportPasteModal visible={pasteOpen} onClose={() => setPasteOpen(false)} />
      <ExportModal visible={exportOpen} onClose={() => setExportOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 12,
    color: COLORS.text,
  },

  identity: {
    alignItems: 'center',
    marginVertical: 16,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentSoft,
  },
  initials: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.accent,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 10,
    color: COLORS.text,
  },
  email: {
    fontSize: 13,
    marginTop: 2,
    color: COLORS.subtext,
  },

  card: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    gap: 2,
    paddingBottom: 5
  },
  divider: {
    height: 1,
    width: '85%',
    alignSelf: 'center',
    backgroundColor: COLORS.divider,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 6,
    color: COLORS.text,
  },

  optionText: { flex: 1 },
  optionDisabled: { opacity: 0.6 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  gutter: {
    width: ROW_GUTTER,
    alignItems: 'flex-start',
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  rowHint: {
    fontSize: 12,
    marginTop: 2,
    color: COLORS.subtext,
  },

  themePicker: {
    opacity: 0.55,
  },
  themeTriggerText: {
    fontStyle: 'normal',
    color: COLORS.text,
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.accentSoft,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },

  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
});