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
import { Colors } from '../../constants/theme.ts';
import type { GoalRecord } from '../../db/schema.ts';
import { useCurrentTime } from '../../hooks/useCurrentTime.ts';

type SectionType = 'completed' | 'paused' | 'dead';

export default function HallOfFameScreen() {
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
        { text: 'Wake Up! ☀️', onPress: () => resumeGoal(id) },
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
          { text: 'Yes, I paid my stake! 🤝', onPress: () => payStake(id, true) },
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
              <Text style={styles.statusBadgeGreen}>👑 Living their best life!</Text>
              <Text style={styles.dateText}>
                Completed on {new Date(item.completedAt || item.updatedAt).toLocaleDateString()}
              </Text>
              <View style={styles.metaRow}>
                <Ionicons name="trophy" size={16} color={Colors.warning} />
                <Text style={styles.metaText}>Best streak: {item.bestStreak}</Text>
              </View>
            </View>
          )}

          {section === 'paused' && (
            <View>
              <Text style={styles.statusBadgeBlue}>💤 Taking a nap</Text>
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
              <Text style={styles.statusBadgeGray}>
                {item.deathCause === 'abandoned' ? '🕊️ Abandoned' : '🥀 Perished from neglect'}
              </Text>
              <Text style={styles.dateText}>
                Died on {new Date(item.diedAt || item.updatedAt).toLocaleDateString()}
              </Text>

              {item.stake ? (
                <View style={styles.stakeBox}>
                  <Text style={styles.stakeLabel}>Stakes Consequence:</Text>
                  <Text style={styles.stakeText}>{`"${item.stake}"`}</Text>
                  <TouchableOpacity
                    style={[styles.stakeButton, item.stakePaid ? styles.stakePaid : styles.stakeUnpaid]}
                    onPress={() => handleToggleStake(item.id, Boolean(item.stakePaid), item.stake)}
                  >
                    <Ionicons
                      name={item.stakePaid ? 'checkmark-circle' : 'alert-circle-outline'}
                      size={18}
                      color={item.stakePaid ? '#FFFFFF' : '#991B1B'}
                    />
                    <Text style={item.stakePaid ? styles.stakePaidText : styles.stakeUnpaidText}>
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
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segmentBtn, section === 'completed' && styles.segmentActive]}
          onPress={() => setSection('completed')}
        >
          <Text style={[styles.segmentText, section === 'completed' && styles.segmentTextActive]}>
            👑 Retired
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, section === 'paused' && styles.segmentActive]}
          onPress={() => setSection('paused')}
        >
          <Text style={[styles.segmentText, section === 'paused' && styles.segmentTextActive]}>
            💤 Napping
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, section === 'dead' && styles.segmentActive]}
          onPress={() => setSection('dead')}
        >
          <Text style={[styles.segmentText, section === 'dead' && styles.segmentTextActive]}>
            🪦 Graveyard
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
            <Text style={styles.emptyIcon}>
              {section === 'completed' ? '🏆' : section === 'paused' ? '😴' : '🌱'}
            </Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    margin: 16,
    borderRadius: 12,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: Colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  segmentTextActive: {
    color: Colors.text,
    fontWeight: '700',
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.text,
    marginBottom: 6,
  },
  statusBadgeGreen: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.successLight,
    color: Colors.success,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  statusBadgeBlue: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight,
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  statusBadgeGray: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
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
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  stakeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
  },
  stakeText: {
    fontSize: 12,
    color: '#7F1D1D',
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
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  stakePaid: {
    backgroundColor: Colors.success,
  },
  stakeUnpaidText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
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
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
