import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Linking,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useGoalStore } from '../../store/useGoalStore.ts';
import { SettingsRepo } from '../../db/repo.ts';
import { exportBackup, importBackup } from '../../services/backup.ts';
import { sendImmediateCheckInNotification } from '../../services/notifications.ts';
import { useTheme } from '../../context/ThemeContext.tsx';
import type { ThemeColors } from '../../constants/theme.ts';

export default function SettingsScreen() {
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { devMode, setDevMode, timeTravel, resetTimeTravel, simulatedTimeOffsetMs, loadGoals } = useGoalStore();
  const [quietHours, setQuietHours] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied'>('granted');

  useEffect(() => {
    SettingsRepo.get('quiet_hours', 'false').then((val) => setQuietHours(val === 'true'));

    void Notifications.getPermissionsAsync().then(
      (res) => setPermissionStatus(res.granted ? 'granted' : 'denied'),
      () => setPermissionStatus('denied'),
    );

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void Notifications.getPermissionsAsync().then(
          (res) => setPermissionStatus(res.granted ? 'granted' : 'denied'),
          () => setPermissionStatus('denied'),
        );
      }
    });

    return () => subscription.remove();
  }, []);

  const handleFixPermissions = async () => {
    try {
      const res = await Notifications.requestPermissionsAsync();
      if (res.granted) {
        setPermissionStatus('granted');
        return;
      }
    } catch {
      // ignore
    }
    await Linking.openSettings();
  };

  const handleToggleQuietHours = async (val: boolean) => {
    setQuietHours(val);
    await SettingsRepo.set('quiet_hours', val ? 'true' : 'false');
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportBackup();
    } catch (e: any) {
      Alert.alert('Export Failed', e.message || 'Could not export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    Alert.alert(
      'Restore Backup?',
      'Restoring a backup will replace your current on-device goals with the backup data. Do you wish to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore File',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsImporting(true);
              const result = await importBackup();
              if (result.success) {
                await loadGoals();
                Alert.alert('Restore Complete', `Successfully restored ${result.goalCount} buddies!`);
              }
            } catch (e: any) {
              Alert.alert('Restore Failed', e.message || 'Invalid or unreadable backup file');
            } finally {
              setIsImporting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Section: Appearance */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>APPEARANCE</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: isDark ? '#312E81' : '#EDE9FE' },
                ]}
              >
                <Ionicons
                  name={isDark ? 'moon' : 'sunny'}
                  size={20}
                  color={isDark ? '#A5B4FC' : '#7C3AED'}
                />
              </View>
              <View>
                <Text style={styles.rowTitle}>Theme</Text>
                <Text style={styles.rowSubtitle}>
                  {themeMode === 'system'
                    ? `System (${isDark ? 'Dark' : 'Light'})`
                    : themeMode === 'dark'
                    ? 'Dark Mode'
                    : 'Light Mode'}
                </Text>
              </View>
            </View>

            <View style={styles.themeToggleRow}>
              {(['system', 'light', 'dark'] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.themeBtn,
                    themeMode === mode && styles.themeBtnActive,
                  ]}
                  onPress={() => setThemeMode(mode)}
                >
                  <Text
                    style={[
                      styles.themeBtnText,
                      themeMode === mode && styles.themeBtnTextActive,
                    ]}
                  >
                    {mode === 'system' ? 'Auto' : mode === 'light' ? 'Light' : 'Dark'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Section: Privacy & Data Backup */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>DATA & BACKUP</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.rowBtn}
            onPress={handleExport}
            disabled={isExporting}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="share-outline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.rowTitle}>Export Data Backup</Text>
                <Text style={styles.rowSubtitle}>Save a JSON file to transfer between phones</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.rowBtn}
            onPress={handleImport}
            disabled={isImporting}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: colors.successLight }]}>
                <Ionicons name="cloud-download-outline" size={20} color={colors.success} />
              </View>
              <View>
                <Text style={styles.rowTitle}>Restore From Backup</Text>
                <Text style={styles.rowSubtitle}>Import goals from a previous JSON backup</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Section: Reminders & Quiet Hours */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>NOTIFICATIONS</Text>
        <View style={styles.card}>
          {/* Permission Status */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor:
                      permissionStatus === 'granted' ? colors.successLight : '#FEE2E2',
                  },
                ]}
              >
                <Ionicons
                  name={permissionStatus === 'granted' ? 'notifications' : 'notifications-off'}
                  size={20}
                  color={permissionStatus === 'granted' ? colors.success : '#DC2626'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Device Permissions</Text>
                <Text style={styles.rowSubtitle}>
                  {permissionStatus === 'granted'
                    ? 'Active — Reminders deliver on schedule'
                    : 'Disabled — Reminders blocked by OS'}
                </Text>
              </View>
            </View>
            {permissionStatus === 'granted' ? (
              <View style={styles.statusPillActive}>
                <Ionicons name="checkmark-circle" size={13} color={colors.success} />
                <Text style={styles.statusPillTextActive}>ACTIVE</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.enableBtn}
                onPress={handleFixPermissions}
              >
                <Text style={styles.enableBtnText}>Enable</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="moon-outline" size={20} color="#D97706" />
              </View>
              <View>
                <Text style={styles.rowTitle}>Quiet Hours (10 PM - 8 AM)</Text>
                <Text style={styles.rowSubtitle}>Suppress notifications while sleeping</Text>
              </View>
            </View>
            <Switch
              value={quietHours}
              onValueChange={handleToggleQuietHours}
              trackColor={{ false: '#CBD5E1', true: colors.primary }}
            />
          </View>
        </View>
      </View>

      {/* Section: Dev Mode & Testing Sandbox */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>DEVELOPER TOOLS & SANDBOX</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                <Ionicons name="construct-outline" size={20} color={isDark ? '#94A3B8' : '#475569'} />
              </View>
              <View>
                <Text style={styles.rowTitle}>Dev Mode</Text>
                <Text style={styles.rowSubtitle}>Reveal hidden health scores & debug tools</Text>
              </View>
            </View>
            <Switch
              value={devMode}
              onValueChange={setDevMode}
              trackColor={{ false: '#CBD5E1', true: colors.primary }}
            />
          </View>

          {devMode && (
            <View style={styles.timeTravelSection}>
              <View style={styles.divider} />
              <View style={styles.timeTravelTitleRow}>
                <Ionicons name="time" size={17} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.timeTravelTitle}>Time Travel Sandbox</Text>
              </View>
              <Text style={styles.timeTravelDesc}>
                Simulate time passing to test overdue decay, last chance, and graveyard transitions:
              </Text>
              <Text style={styles.offsetDisplay}>
                Current offset: +{Math.round(simulatedTimeOffsetMs / 86400_000)} days (
                {Math.round(simulatedTimeOffsetMs / 3600_000)} hours)
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.timeBtn} onPress={() => timeTravel(1)}>
                  <Text style={styles.timeBtnText}>+1 Day</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.timeBtn} onPress={() => timeTravel(3)}>
                  <Text style={styles.timeBtnText}>+3 Days</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.timeBtn} onPress={() => timeTravel(7)}>
                  <Text style={styles.timeBtnText}>+1 Week</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.timeBtn} onPress={() => timeTravel(30)}>
                  <Text style={styles.timeBtnText}>+1 Month</Text>
                </TouchableOpacity>
              </View>

              {simulatedTimeOffsetMs > 0 && (
                <TouchableOpacity style={styles.resetBtn} onPress={resetTimeTravel}>
                  <Ionicons name="refresh" size={16} color={colors.danger} />
                  <Text style={styles.resetBtnText}>Reset to Real Time</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.devNotifBtn}
                onPress={() => sendImmediateCheckInNotification('Daily Workout', 'fitness', 'good')}
              >
                <Ionicons name="notifications-outline" size={16} color={colors.primary} />
                <Text style={styles.devNotifBtnText}>Test Check-in Notification</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Philosophy note */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
        <Text style={styles.infoText}>
          Accountabilibuddies keeps health numbers hidden during normal use. The goal is to build consistent lifelong habits, rather than stressing over metrics!
        </Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 16,
      paddingBottom: 40,
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      marginBottom: 8,
      marginLeft: 4,
      letterSpacing: 0.5,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
    },
    rowBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    iconBox: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    rowSubtitle: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    themeToggleRow: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 3,
      borderWidth: 1,
      borderColor: colors.border,
    },
    themeBtn: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
    },
    themeBtnActive: {
      backgroundColor: colors.primary,
    },
    themeBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    themeBtnTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
    },
    timeTravelSection: {
      paddingVertical: 14,
    },
    timeTravelTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
      marginBottom: 4,
    },
    timeTravelTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    timeTravelDesc: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 8,
      lineHeight: 18,
    },
    offsetDisplay: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: 12,
    },
    buttonRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 10,
    },
    timeBtn: {
      backgroundColor: colors.primaryLight,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 8,
    },
    timeBtnText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 12,
    },
    resetBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      gap: 6,
      marginTop: 6,
    },
    resetBtnText: {
      color: colors.danger,
      fontWeight: '700',
      fontSize: 13,
    },
    infoCard: {
      flexDirection: 'row',
      backgroundColor: colors.primaryLight,
      borderRadius: 12,
      padding: 14,
      gap: 10,
      alignItems: 'center',
      marginTop: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    infoText: {
      flex: 1,
      fontSize: 12,
      color: colors.text,
      lineHeight: 18,
    },
    devNotifBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryLight,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      gap: 8,
      marginTop: 12,
    },
    devNotifBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    },
    statusPillActive: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.successLight,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statusPillTextActive: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.success,
    },
    enableBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    enableBtnText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 12,
    },
  });
