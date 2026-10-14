// frontend/src/app/(tabs)/profile.tsx
import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackupSection } from '@/components/profile/backup-section';
import { DisclosureRow, ROW_GUTTER } from '@/components/profile/disclosure-row';
import { DropdownPicker } from '@/components/shared/dropdown-picker';
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

type Permission = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  name: string;
  description: string;
  granted: boolean;
};

const PERMISSIONS: Permission[] = [
  {
    id: 'sms',
    icon: 'chatbubble-ellipses-outline',
    name: 'SMS',
    description: 'Read M-Pesa messages to import transactions',
    granted: true,
  },
  {
    id: 'notifications',
    icon: 'notifications-outline',
    name: 'Notifications',
    description: 'Budget alerts and bill reminders',
    granted: true,
  },
  {
    id: 'biometrics',
    icon: 'finger-print-outline',
    name: 'Biometrics',
    description: 'Unlock the app with fingerprint or face',
    granted: false,
  },
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

  const lockEnabled = useSettingsStore((state) => state.lockEnabled);
  const setLockEnabled = useSettingsStore((state) => state.setLockEnabled);

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
          <View style={styles.row}>
            <View style={styles.gutter}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={COLORS.accent}
              />
            </View>

            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>App lock</Text>
              <Text style={styles.rowHint}>
                Require biometrics to open the app
              </Text>
            </View>

            <Switch
              value={lockEnabled}
              onValueChange={setLockEnabled}
              trackColor={{
                false: COLORS.divider,
                true: COLORS.accent,
              }}
              thumbColor="#FFFFFF"
            />
          </View>

          <Divider />

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

          <DisclosureRow label="Backup" icon='cloud-outline' labelStyle={styles.rowLabel}>
            <BackupSection />
          </DisclosureRow>

          <Divider />
          <DisclosureRow label="Donate" icon='heart' labelStyle={styles.rowLabel}>
            <Text style={styles.rowHint}>
              Support the development of PesaPlan.
            </Text>

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
          {PERMISSIONS.map((permission, index) => (
            <View key={permission.id}>
              {index > 0 && <Divider />}

              <Pressable
                style={styles.row}
                onPress={() => Linking.openSettings()}
              >
                <View style={styles.gutter}>
                  <Ionicons
                    name={permission.icon}
                    size={18}
                    color={COLORS.accent}
                  />
                </View>

                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{permission.name}</Text>
                  <Text style={styles.rowHint}>
                    {permission.description}
                  </Text>
                </View>

                <View
                  style={[
                    styles.pill,
                    {
                      backgroundColor: permission.granted
                        ? COLORS.successSoft
                        : COLORS.neutralPill,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      {
                        color: permission.granted
                          ? COLORS.success
                          : COLORS.subtext,
                      },
                    ]}
                  >
                    {permission.granted ? 'Granted' : 'Off'}
                  </Text>
                </View>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
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