import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGoalStore } from '../../store/useGoalStore.ts';
import { SettingsRepo } from '../../db/repo.ts';
import { exportBackup, importBackup } from '../../services/backup.ts';
import { Colors } from '../../constants/theme.ts';

export default function SettingsScreen() {
  const { devMode, setDevMode, timeTravel, resetTimeTravel, simulatedTimeOffsetMs, loadGoals } = useGoalStore();
  const [quietHours, setQuietHours] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    SettingsRepo.get('quiet_hours', 'false').then((val) => setQuietHours(val === 'true'));
  }, []);

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
              <View style={[styles.iconBox, { backgroundColor: Colors.primaryLight }]}>
                <Ionicons name="share-outline" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.rowTitle}>Export Data Backup</Text>
                <Text style={styles.rowSubtitle}>Save a JSON file to transfer between phones</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.rowBtn}
            onPress={handleImport}
            disabled={isImporting}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: Colors.successLight }]}>
                <Ionicons name="cloud-download-outline" size={20} color={Colors.success} />
              </View>
              <View>
                <Text style={styles.rowTitle}>Restore From Backup</Text>
                <Text style={styles.rowSubtitle}>Import goals from a previous JSON backup</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Section: Reminders & Quiet Hours */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>NOTIFICATIONS</Text>
        <View style={styles.card}>
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
              trackColor={{ false: '#CBD5E1', true: Colors.primary }}
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
              <View style={[styles.iconBox, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="construct-outline" size={20} color="#475569" />
              </View>
              <View>
                <Text style={styles.rowTitle}>Dev Mode</Text>
                <Text style={styles.rowSubtitle}>Reveal hidden health scores & debug tools</Text>
              </View>
            </View>
            <Switch
              value={devMode}
              onValueChange={setDevMode}
              trackColor={{ false: '#CBD5E1', true: Colors.primary }}
            />
          </View>

          {devMode && (
            <View style={styles.timeTravelSection}>
              <View style={styles.divider} />
              <Text style={styles.timeTravelTitle}>⏱️ Time Travel Sandbox</Text>
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
                  <Ionicons name="refresh" size={16} color="#DC2626" />
                  <Text style={styles.resetBtnText}>Reset to Real Time</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Philosophy note */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={22} color={Colors.primary} />
        <Text style={styles.infoText}>
          Accountabilibuddies keeps health numbers hidden during normal use. The goal is to build consistent lifelong habits, rather than stressing over metrics!
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    color: Colors.textMuted,
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.text,
  },
  rowSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  timeTravelSection: {
    paddingVertical: 14,
  },
  timeTravelTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 10,
    marginBottom: 4,
  },
  timeTravelDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 8,
    lineHeight: 18,
  },
  offsetDisplay: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  timeBtn: {
    backgroundColor: Colors.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  timeBtnText: {
    color: Colors.primary,
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
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 18,
  },
});
