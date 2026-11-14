import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  text: '#07022A',
  subtext: '#666666',
  accent: '#3F2FD6',
  accentSoft: '#EEEBFF',
  success: '#1FA64A',
};

type Provider = 'google' | 'apple';
type Stage = 'connecting' | 'backing_up';

const PROVIDERS: {
  id: Provider;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'google', label: 'Back up to Google', icon: 'logo-google' },
  { id: 'apple', label: 'Back up to Apple account', icon: 'logo-apple' },
];

const STAGE_TEXT: Record<Stage, string> = {
  connecting: 'Connecting…',
  backing_up: 'Backing up your data…',
};

const formatTime = (date: Date) =>
  date.toLocaleTimeString('en-KE', {
    hour: 'numeric',
    minute: '2-digit',
  });

export function BackupSection() {
  const [job, setJob] = useState<{
    provider: Provider;
    stage: Stage;
  } | null>(null);

  const [last, setLast] = useState<{
    provider: Provider;
    at: Date;
  } | null>(null);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
    };
  }, []);

  function start(provider: Provider) {
    if (job) return;

    setJob({ provider, stage: 'connecting' });

    // TODO: replace these timers with real connect + upload calls.
    timers.current.push(
      setTimeout(
        () => setJob({ provider, stage: 'backing_up' }),
        1500
      )
    );

    timers.current.push(
      setTimeout(() => {
        setJob(null);
        setLast({ provider, at: new Date() });
      }, 4500)
    );
  }

  return (
    <>
      {PROVIDERS.map(({ id, label, icon }) => {
        const stage = job?.provider === id ? job.stage : null;
        const running = stage !== null;
        const done = !running && last?.provider === id;

        return (
          <Pressable
            key={id}
            onPress={() => start(id)}
            disabled={!!job}
            style={[
              styles.option,
              { backgroundColor: COLORS.accentSoft },
              !!job && !running && styles.dimmed,
            ]}
          >
            <Ionicons name={icon} size={18} color={COLORS.accent} />

            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>{label}</Text>

              {running && (
                <Text style={styles.status}>
                  {STAGE_TEXT[stage]}
                </Text>
              )}

              {done && (
                <Text style={styles.status}>
                  Last backup · {formatTime(last.at)}
                </Text>
              )}
            </View>

            {running && (
              <ActivityIndicator size="small" color={COLORS.accent} />
            )}

            {done && (
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={COLORS.success}
              />
            )}
          </Pressable>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
  },
  dimmed: {
    opacity: 0.4,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  status: {
    fontSize: 12,
    marginTop: 2,
    color: COLORS.subtext,
  },
});