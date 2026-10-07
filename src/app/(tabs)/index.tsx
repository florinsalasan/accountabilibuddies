import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGoalStore } from '../../store/useGoalStore.ts';
import { Avatar } from '../../components/avatar/Avatar.tsx';
import { CategoryIcon } from '../../components/CategoryIcon.tsx';
import { effectiveHealth, healthState, isCheckInOpen, isOverdue } from '../../domain/health.ts';
import { CADENCE_LABEL } from '../../domain/periods.ts';
import { Colors } from '../../constants/theme.ts';
import type { GoalRecord } from '../../db/schema.ts';
import { useCurrentTime } from '../../hooks/useCurrentTime.ts';

export default function HomeScreen() {
  const { goals, isLoading, loadGoals, devMode, simulatedTimeOffsetMs } = useGoalStore();
  const now = useCurrentTime();

  // Filter for active & lastChance goals on Home screen
  const activeGoals = goals.filter(
    (g) => g.lifeState === 'active' || g.lifeState === 'lastChance',
  );

  // Sort: Last chance & overdue first, then open check-ins, then others
  const sortedGoals = [...activeGoals].sort((a, b) => {
    const aLastChance = a.lifeState === 'lastChance' ? 1 : 0;
    const bLastChance = b.lifeState === 'lastChance' ? 1 : 0;
    if (aLastChance !== bLastChance) return bLastChance - aLastChance;

    const aOverdue = isOverdue(a as any, now) ? 1 : 0;
    const bOverdue = isOverdue(b as any, now) ? 1 : 0;
    if (aOverdue !== bOverdue) return bOverdue - aOverdue;

    const aOpen = isCheckInOpen(a as any, now) ? 1 : 0;
    const bOpen = isCheckInOpen(b as any, now) ? 1 : 0;
    if (aOpen !== bOpen) return bOpen - aOpen;

    return a.nextDueAt - b.nextDueAt;
  });

  const renderGoalCard = ({ item }: { item: GoalRecord }) => {
    const currentHealth = effectiveHealth(item as any, now);
    const hState = healthState(currentHealth);
    const checkInOpen = isCheckInOpen(item as any, now);
    const overdue = isOverdue(item as any, now);
    const inLastChance = item.lifeState === 'lastChance';

    let statusBadgeColor = Colors.primary;
    let statusIcon: keyof typeof Ionicons.glyphMap = 'time-outline';
    let statusText = `Due ${new Date(item.nextDueAt).toLocaleDateString(undefined, { weekday: 'short' })}`;

    if (inLastChance) {
      statusBadgeColor = Colors.danger;
      statusIcon = 'warning';
      statusText = 'LAST CHANCE';
    } else if (overdue) {
      statusBadgeColor = Colors.danger;
      statusIcon = 'alert-circle';
      statusText = 'Overdue';
    } else if (checkInOpen) {
      statusBadgeColor = Colors.success;
      statusIcon = 'checkmark-circle';
      statusText = 'Check-in Ready';
    }

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => router.push(`/goals/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.categoryBadge}>
            <CategoryIcon category={item.category} size={14} color={Colors.primary} />
            <Text style={styles.categoryText}>{item.category.toUpperCase()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusBadgeColor }]}>
            <Ionicons name={statusIcon} size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Avatar
            category={item.category}
            healthState={hState}
            lifeState={item.lifeState}
            size={110}
          />
          <View style={styles.cardContent}>
            <Text style={styles.goalTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {item.why ? (
              <Text style={styles.goalWhy} numberOfLines={2}>
                {`"${item.why}"`}
              </Text>
            ) : null}

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="flame" size={16} color={Colors.warning} />
                <Text style={styles.metaText}>{item.onTimeStreak} streak</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={15} color={Colors.textMuted} />
                <Text style={styles.metaText}>{CADENCE_LABEL[item.cadence]}</Text>
              </View>
            </View>

            {devMode && (
              <View style={styles.devBox}>
                <Ionicons name="construct" size={13} color="#475569" style={{ marginRight: 4 }} />
                <Text style={styles.devText}>
                  Health: {Math.round(currentHealth)}/100 ({hState})
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {devMode && simulatedTimeOffsetMs !== 0 && (
        <View style={styles.timeTravelBanner}>
          <Ionicons name="time" size={16} color="#0369A1" style={{ marginRight: 6 }} />
          <Text style={styles.timeTravelText}>
            Time Travel active: +{Math.round(simulatedTimeOffsetMs / 86400_000)} days
          </Text>
        </View>
      )}

      <FlatList
        data={sortedGoals}
        keyExtractor={(item) => item.id}
        renderItem={renderGoalCard}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadGoals} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Avatar category="generic" healthState="good" size={160} />
            <Text style={styles.emptyTitle}>No active buddies yet!</Text>
            <Text style={styles.emptySubtitle}>
              Create a goal to bring your first buddy to life. They will keep you accountable and stay by your side!
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/goals/create')}
            >
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create My First Buddy</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {activeGoals.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={() => router.push('/goals/create')}
        >
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  timeTravelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#BAE6FD',
  },
  timeTravelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0369A1',
  },
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  goalWhy: {
    fontSize: 13,
    fontStyle: 'italic',
    color: Colors.textMuted,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  devBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  devText: {
    fontSize: 11,
    color: '#475569',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
});
