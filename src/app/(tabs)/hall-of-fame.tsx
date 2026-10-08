import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGoalStore } from '../../store/useGoalStore.ts';
import { Avatar } from '../../components/avatar/Avatar.tsx';
import { effectiveHealth, healthState } from '../../domain/health.ts';
import type { ThemeColors } from '../../constants/theme.ts';
import type { GoalRecord } from '../../db/schema.ts';
import { useCurrentTime } from '../../hooks/useCurrentTime.ts';
import { useTheme } from '../../context/ThemeContext.tsx';

type SectionType = 'completed' | 'paused' | 'dead';

export default function HallOfFameScreen() {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [section, setSection] = useState<SectionType>('completed');
  const { goals, resumeGoal, payStake } = useGoalStore();
  const now = useCurrentTime();

  const filteredGoals = goals.filter((g) => g.lifeState === section);

  const handleResume = (id: string, title: string) => {
    Alert.alert(
      'Wake Up Buddy?',
      `Are you ready to resume working on "${title}"? Your buddy will wake up and be ready for a welcome-back check-in!`,
      [
        { text: 'Not yet', style: 'cancel' },
        { text: 'Wake Up!', onPress: () => resumeGoal(id) },
      ],
    );
  };

  const handleToggleStake = (id: string, currentPaid: boolean, stake: string | null) => {
    if (currentPaid) {
      payStake(id, false);
    } else {
      Alert.alert(
        'Honor System Confirmation',
        `Did you fulfill your consequence?\n\n"${stake}"`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes, I paid my stake!', onPress: () => payStake(id, true) },
        ],
      );
    }
  };

  const renderItem = ({ item }: { item: GoalRecord }) => {
    const currentHealth = effectiveHealth(item as any, now);
    const hState = healthState(currentHealth);

    return (
      <View style={styles.card}>
        <View style={styles.avatarContainer}>
          <Avatar
            category={item.category}
            healthState={hState}
            lifeState={item.lifeState}
            size={120}
          />
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.goalTitle}>{item.title}</Text>

          {section === 'completed' && (
            <View>
              <View style={styles.statusBadgeGreenRow}>
                <Ionicons name="ribbon" size={13} color={colors.success} style={{ marginRight: 4 }} />
                <Text style={styles.statusBadgeGreen}>Living their best life!</Text>
              </View>
              <Text style={styles.dateText}>
                Completed on {new Date(item.completedAt || item.updatedAt).toLocaleDateString()}
              </Text>
              <View style={styles.metaRow}>
                <Ionicons name="trophy" size={16} color={colors.warning} />
                <Text style={styles.metaText}>Best streak: {item.bestStreak}</Text>
              </View>
            </View>
          )}

          {section === 'paused' && (
            <View>
              <View style={styles.statusBadgeBlueRow}>
                <Ionicons name="moon" size={13} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.statusBadgeBlue}>Taking a nap</Text>
              </View>
              <Text style={styles.dateText}>
                Paused on {new Date(item.pausedAt || item.updatedAt).toLocaleDateString()}
              </Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleResume(item.id, item.title)}
              >
                <Ionicons name="sunny-outline" size={16} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Wake Up Buddy</Text>
              </TouchableOpacity>
            </View>
          )}

          {section === 'dead' && (
            <View>
              <View style={styles.statusBadgeGrayRow}>
                <Ionicons
                  name={item.deathCause === 'abandoned' ? 'flag-outline' : 'skull-outline'}
                  size={13}
                  color={colors.textMuted}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.statusBadgeGray}>
                  {item.deathCause === 'abandoned' ? 'Abandoned' : 'Perished from neglect'}
                </Text>
              </View>
              <Text style={styles.dateText}>
                Died on {new Date(item.diedAt || item.updatedAt).toLocaleDateString()}
              </Text>

              {item.stake ? (
                <View style={[styles.stakeBox, { backgroundColor: isDark ? '#450A0A' : '#FEF2F2' }]}>
                  <Text style={[styles.stakeLabel, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>
                    Stakes Consequence:
                  </Text>
                  <Text style={[styles.stakeText, { color: isDark ? '#FECACA' : '#7F1D1D' }]}>
                    {`"${item.stake}"`}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.stakeButton,
                      item.stakePaid
                        ? styles.stakePaid
                        : [
                            styles.stakeUnpaid,
                            {
                              backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2',
                              borderColor: isDark ? '#991B1B' : '#FCA5A5',
                            },
                          ],
                    ]}
                    onPress={() => handleToggleStake(item.id, Boolean(item.stakePaid), item.stake)}
                  >
                    <Ionicons
                      name={item.stakePaid ? 'checkmark-circle' : 'alert-circle-outline'}
                      size={18}
                      color={item.stakePaid ? '#FFFFFF' : isDark ? '#FCA5A5' : '#991B1B'}
                    />
                    <Text
                      style={
                        item.stakePaid
                          ? styles.stakePaidText
                          : [styles.stakeUnpaidText, { color: isDark ? '#FCA5A5' : '#991B1B' }]
                      }
                    >
                      {item.stakePaid ? 'Stake Paid (Honor Restored)' : 'Pay Consequence'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Segmented Control */}
      <View style={[styles.segmentedControl, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
        <TouchableOpacity
          style={[styles.segmentBtn, section === 'completed' && styles.segmentActive]}
          onPress={() => setSection('completed')}
        >
          <Ionicons
            name="ribbon"
            size={16}
            color={section === 'completed' ? colors.primary : colors.textMuted}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.segmentText, section === 'completed' && styles.segmentTextActive]}>
            Retired
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, section === 'paused' && styles.segmentActive]}
          onPress={() => setSection('paused')}
        >
          <Ionicons
            name="moon"
            size={15}
            color={section === 'paused' ? colors.primary : colors.textMuted}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.segmentText, section === 'paused' && styles.segmentTextActive]}>
            Napping
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, section === 'dead' && styles.segmentActive]}
          onPress={() => setSection('dead')}
        >
          <Ionicons
            name="skull"
            size={15}
            color={section === 'dead' ? colors.danger : colors.textMuted}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.segmentText, section === 'dead' && styles.segmentTextActive]}>
            Graveyard
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredGoals}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              {section === 'completed' ? (
                <Ionicons name="trophy-outline" size={54} color={colors.warning} />
              ) : section === 'paused' ? (
                <Ionicons name="moon-outline" size={54} color={colors.primary} />
              ) : (
                <Ionicons name="leaf-outline" size={54} color={colors.success} />
              )}
            </View>
            <Text style={styles.emptyTitle}>
              {section === 'completed'
                ? 'No retired buddies yet'
                : section === 'paused'
                ? 'No buddies currently napping'
                : 'The graveyard is happily empty!'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {section === 'completed'
                ? 'When you accomplish your goals, your buddies graduate here to live a great life.'
                : section === 'paused'
                ? 'Need a break due to an injury or vacation? You can pause any buddy anytime.'
                : 'Keep your check-in habits going to keep all your buddies healthy!'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    segmentedControl: {
      flexDirection: 'row',
      margin: 16,
      borderRadius: 12,
      padding: 4,
    },
    segmentBtn: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 8,
    },
    segmentActive: {
      backgroundColor: colors.card,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    segmentText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
    },
    segmentTextActive: {
      color: colors.text,
      fontWeight: '700',
    },
    list: {
      padding: 16,
      paddingTop: 0,
    },
    card: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    avatarContainer: {
      marginRight: 14,
    },
    cardContent: {
      flex: 1,
    },
    goalTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
    },
    statusBadgeGreenRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: colors.successLight,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      marginBottom: 4,
    },
    statusBadgeGreen: {
      color: colors.success,
      fontSize: 11,
      fontWeight: '700',
    },
    statusBadgeBlueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      marginBottom: 4,
    },
    statusBadgeBlue: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '700',
    },
    statusBadgeGrayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: colors.background,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      marginBottom: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statusBadgeGray: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
    },
    dateText: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 6,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    metaText: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '600',
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      alignSelf: 'flex-start',
      gap: 6,
      marginTop: 4,
    },
    actionButtonText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    stakeBox: {
      padding: 10,
      borderRadius: 8,
      marginTop: 6,
    },
    stakeLabel: {
      fontSize: 11,
      fontWeight: '700',
    },
    stakeText: {
      fontSize: 12,
      fontStyle: 'italic',
      marginVertical: 4,
    },
    stakeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      gap: 6,
      marginTop: 4,
    },
    stakeUnpaid: {
      borderWidth: 1,
    },
    stakePaid: {
      backgroundColor: colors.success,
    },
    stakeUnpaidText: {
      fontSize: 11,
      fontWeight: '700',
    },
    stakePaidText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 80,
      paddingHorizontal: 32,
    },
    emptyIconContainer: {
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
