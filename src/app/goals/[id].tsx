import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGoalStore } from '../../store/useGoalStore.ts';
import { Avatar } from '../../components/avatar/Avatar.tsx';
import {
  effectiveHealth,
  healthState,
  isCheckInOpen,
  isOverdue,
  checkInOpensAt,
} from '../../domain/health.ts';
import { CADENCE_LABEL } from '../../domain/periods.ts';
import { Colors } from '../../constants/theme.ts';
import type { Rating } from '../../domain/types.ts';
import { useCurrentTime } from '../../hooks/useCurrentTime.ts';

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    activeGoalDetail,
    loadGoalDetail,
    checkIn,
    logProgress,
    toggleMilestone,
    pauseGoal,
    completeGoal,
    abandonGoal,
    deleteGoal,
    devMode,
    setGoalHealth,
    triggerDevNotification,
  } = useGoalStore();

  const [selectedRating, setSelectedRating] = useState<Exclude<Rating, 'missed'>>('on_track');
  const [checkInNote, setCheckInNote] = useState('');
  const [quickAmount, setQuickAmount] = useState('1');
  const [quickNote, setQuickNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const now = useCurrentTime();

  useEffect(() => {
    if (id) {
      loadGoalDetail(id);
    }
  }, [id, loadGoalDetail]);

  if (!activeGoalDetail || activeGoalDetail.goal.id !== id) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const { goal, milestones } = activeGoalDetail;
  const currentHealth = effectiveHealth(goal as any, now);
  const hState = healthState(currentHealth);
  const canCheckIn = isCheckInOpen(goal as any, now);
  const overdue = isOverdue(goal as any, now);
  const opensAt = checkInOpensAt(goal as any);

  const handleCheckInSubmit = async () => {
    try {
      setIsSubmitting(true);
      await checkIn(goal.id, selectedRating, checkInNote);
      setCheckInNote('');
      Alert.alert('Check-in Saved!', 'Your buddy appreciated the update!');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not record check-in');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLog = async () => {
    const amt = parseFloat(quickAmount) || 1;
    await logProgress({
      goalId: goal.id,
      amount: amt,
      note: quickNote,
      source: 'manual',
    });
    setQuickNote('');
    Alert.alert('Logged!', `Added +${amt} ${goal.unit || 'progress'}`);
  };

  const handleOpenPauseModal = () => {
    setPauseReason('');
    setIsPauseModalOpen(true);
  };

  const handleConfirmPause = async () => {
    setIsPauseModalOpen(false);
    await pauseGoal(goal.id, pauseReason.trim() || undefined);
    router.back();
  };

  const handleCompletePrompt = () => {
    Alert.alert(
      'Graduate to Hall of Fame?',
      `Congratulations on accomplishing "${goal.title}"! Your buddy will retire and live their best life in the Hall of Fame.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete Goal!',
          onPress: async () => {
            await completeGoal(goal.id);
            router.back();
          },
        },
      ],
    );
  };

  const handleAbandonPrompt = () => {
    Alert.alert(
      'Abandon Goal?',
      goal.stake
        ? `Abandoning will send your buddy to the graveyard and trigger your stake consequence:\n\n"${goal.stake}"\n\nAre you sure you want to abandon?`
        : 'Are you sure you want to abandon this goal? Your buddy will move to the graveyard.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Abandon',
          style: 'destructive',
          onPress: async () => {
            await abandonGoal(goal.id);
            router.back();
          },
        },
      ],
    );
  };

  const handleDeletePrompt = () => {
    Alert.alert('Delete Goal', 'Permanently delete this goal and its history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Forever',
        style: 'destructive',
        onPress: async () => {
          await deleteGoal(goal.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Big Interactive Avatar Header */}
      <View style={styles.avatarHeader}>
        <Avatar
          category={goal.category}
          healthState={hState}
          lifeState={goal.lifeState}
          size={210}
        />
        <Text style={styles.goalTitle}>{goal.title}</Text>
        {goal.why ? <Text style={styles.goalWhy}>{`"${goal.why}"`}</Text> : null}

        <View style={styles.metaRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{goal.category.toUpperCase()}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{CADENCE_LABEL[goal.cadence]}</Text>
          </View>
          {goal.targetDate ? (
            <View style={[styles.badge, { backgroundColor: Colors.primaryLight }]}>
              <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
              <Text style={[styles.badgeText, { color: Colors.primary }]}>
                Target: {new Date(goal.targetDate).toLocaleDateString()}
              </Text>
            </View>
          ) : null}
          <View style={[styles.badge, { backgroundColor: Colors.warningLight }]}>
            <Ionicons name="flame" size={14} color={Colors.warning} />
            <Text style={[styles.badgeText, { color: '#B45309' }]}>
              {goal.onTimeStreak} On-Time Streak
            </Text>
          </View>
        </View>

        {devMode && (
          <View style={styles.devCard}>
            <View style={styles.devHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="construct" size={14} color="#475569" style={{ marginRight: 5 }} />
                <Text style={styles.devText}>
                  DEV SCORE: {Math.round(currentHealth)}/100 ({hState.toUpperCase()})
                </Text>
              </View>
              <View style={styles.devStepperRow}>
                <TouchableOpacity
                  style={styles.devStepBtn}
                  onPress={() => setGoalHealth(goal.id, goal.health - 10)}
                >
                  <Text style={styles.devStepBtnText}>-10</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.devStepBtn}
                  onPress={() => setGoalHealth(goal.id, goal.health + 10)}
                >
                  <Text style={styles.devStepBtnText}>+10</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.devSubText}>
              Base: {Math.round(goal.health)} | Best streak: {goal.bestStreak} | No-progress: {goal.noProgressStreak}
            </Text>

            {/* Quick State Presets */}
            <View style={styles.devPresetRow}>
              <TouchableOpacity
                style={[styles.devPresetBtn, hState === 'thriving' && styles.devPresetBtnActive]}
                onPress={() => setGoalHealth(goal.id, 95)}
              >
                <Ionicons
                  name="sparkles"
                  size={12}
                  color={hState === 'thriving' ? '#0369A1' : '#D97706'}
                  style={{ marginRight: 3 }}
                />
                <Text style={[styles.devPresetText, hState === 'thriving' && styles.devPresetTextActive]}>
                  Thriving
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.devPresetBtn, hState === 'good' && styles.devPresetBtnActive]}
                onPress={() => setGoalHealth(goal.id, 70)}
              >
                <Ionicons
                  name="happy"
                  size={12}
                  color={hState === 'good' ? '#0369A1' : '#16A34A'}
                  style={{ marginRight: 3 }}
                />
                <Text style={[styles.devPresetText, hState === 'good' && styles.devPresetTextActive]}>
                  Good
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.devPresetBtn, hState === 'meh' && styles.devPresetBtnActive]}
                onPress={() => setGoalHealth(goal.id, 50)}
              >
                <Ionicons
                  name="ellipse"
                  size={10}
                  color={hState === 'meh' ? '#0369A1' : '#D97706'}
                  style={{ marginRight: 3 }}
                />
                <Text style={[styles.devPresetText, hState === 'meh' && styles.devPresetTextActive]}>
                  Meh
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.devPresetBtn, hState === 'struggling' && styles.devPresetBtnActive]}
                onPress={() => setGoalHealth(goal.id, 30)}
              >
                <Ionicons
                  name="sad"
                  size={12}
                  color={hState === 'struggling' ? '#0369A1' : '#EA580C'}
                  style={{ marginRight: 3 }}
                />
                <Text style={[styles.devPresetText, hState === 'struggling' && styles.devPresetTextActive]}>
                  Struggling
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.devPresetBtn, hState === 'dying' && styles.devPresetBtnActive]}
                onPress={() => setGoalHealth(goal.id, 10)}
              >
                <Ionicons
                  name="skull"
                  size={12}
                  color={hState === 'dying' ? '#0369A1' : '#DC2626'}
                  style={{ marginRight: 3 }}
                />
                <Text style={[styles.devPresetText, hState === 'dying' && styles.devPresetTextActive]}>
                  Dying
                </Text>
              </TouchableOpacity>
            </View>

            {/* Trigger Notification Button */}
            <TouchableOpacity
              style={styles.devNotifBtn}
              onPress={() => triggerDevNotification(goal.id)}
            >
              <Ionicons name="notifications-outline" size={15} color="#0284C7" />
              <Text style={styles.devNotifBtnText}>Trigger Check-in Notification</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Official Check-In Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>OFFICIAL CHECK-IN</Text>
          {canCheckIn ? (
            <View style={styles.openPill}>
              <Text style={styles.openPillText}>READY</Text>
            </View>
          ) : (
            <Text style={styles.opensLaterText}>
              Opens {new Date(opensAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>

        {canCheckIn ? (
          <View style={styles.checkInCard}>
            <Text style={styles.checkInPrompt}>
              {goal.welcomeBack
                ? 'Welcome back! How did things go during your break?'
                : overdue
                ? 'Your check-in is overdue! Check in now to stop health decay:'
                : 'How did you do for this period?'}
            </Text>

            {/* Rating Buttons */}
            <View style={styles.ratingsRow}>
              <TouchableOpacity
                style={[styles.ratingBtn, selectedRating === 'on_track' && styles.ratingSelected]}
                onPress={() => setSelectedRating('on_track')}
              >
                <View style={styles.ratingIconContainer}>
                  <Ionicons
                    name="rocket"
                    size={22}
                    color={selectedRating === 'on_track' ? Colors.primary : Colors.textMuted}
                  />
                </View>
                <Text style={styles.ratingTitle}>On Track</Text>
                <Text style={styles.ratingSub}>+20 health</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.ratingBtn, selectedRating === 'some' && styles.ratingSelected]}
                onPress={() => setSelectedRating('some')}
              >
                <View style={styles.ratingIconContainer}>
                  <Ionicons
                    name="thumbs-up"
                    size={22}
                    color={selectedRating === 'some' ? Colors.primary : Colors.textMuted}
                  />
                </View>
                <Text style={styles.ratingTitle}>A Little</Text>
                <Text style={styles.ratingSub}>+10 health</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.ratingBtn, selectedRating === 'none' && styles.ratingSelected]}
                onPress={() => setSelectedRating('none')}
              >
                <View style={styles.ratingIconContainer}>
                  <Ionicons
                    name="hourglass"
                    size={22}
                    color={selectedRating === 'none' ? Colors.primary : Colors.textMuted}
                  />
                </View>
                <Text style={styles.ratingTitle}>Nothing</Text>
                <Text style={styles.ratingSub}>0 gain</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.noteInput}
              placeholder="Add an optional note about your progress..."
              value={checkInNote}
              onChangeText={setCheckInNote}
            />

            <TouchableOpacity
              style={[styles.submitCheckInBtn, isSubmitting && { opacity: 0.6 }]}
              disabled={isSubmitting}
              onPress={handleCheckInSubmit}
            >
              <Ionicons name="checkmark-done" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.submitCheckInText}>Save Check-in</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.lockedCheckInCard}>
            <Ionicons name="time-outline" size={24} color={Colors.textMuted} />
            <Text style={styles.lockedText}>
              Next check-in window opens {new Date(opensAt).toLocaleDateString()} at{' '}
              {new Date(opensAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
            </Text>
            <Text style={styles.lockedSubText}>
              You can still quick-log progress below at any time!
            </Text>
          </View>
        )}
      </View>

      {/* Quick Progress / Milestones Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>LOG PROGRESS</Text>

        {goal.type === 'milestone' ? (
          <View style={styles.milestonesList}>
            {milestones.map((m, idx) => (
              <TouchableOpacity
                key={m.id}
                style={styles.milestoneItem}
                onPress={() => toggleMilestone(goal.id, m.id, !m.doneAt)}
              >
                <Ionicons
                  name={m.doneAt ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={m.doneAt ? Colors.success : Colors.textMuted}
                />
                <Text
                  style={[
                    styles.milestoneItemTitle,
                    m.doneAt ? styles.milestoneDone : undefined,
                  ]}
                >
                  {idx + 1}. {m.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.quickLogCard}>
            <View style={styles.quickLogRow}>
              <TextInput
                style={styles.quickAmountInput}
                keyboardType="numeric"
                value={quickAmount}
                onChangeText={setQuickAmount}
              />
              <TextInput
                style={styles.quickNoteInput}
                placeholder={`e.g. +${quickAmount} ${goal.unit || 'progress'} completed today`}
                value={quickNote}
                onChangeText={setQuickNote}
              />
              <TouchableOpacity style={styles.quickLogBtn} onPress={handleQuickLog}>
                <Ionicons name="add" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Stakes Card */}
      {goal.stake ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SELF-SET STAKES</Text>
          <View style={styles.stakeCard}>
            <Ionicons name="warning-outline" size={24} color="#DC2626" />
            <View style={{ flex: 1 }}>
              <Text style={styles.stakeTitle}>Honor System Consequence</Text>
              <Text style={styles.stakeBody}>{`"${goal.stake}"`}</Text>
              <Text style={styles.stakeNotice}>
                This consequence is triggered if this buddy perishes in the graveyard.
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* Goal Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>BUDDY MANAGEMENT</Text>
        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionRow} onPress={handleOpenPauseModal}>
            <Ionicons name="bed-outline" size={20} color={Colors.primary} />
            <Text style={styles.actionRowText}>Pause Buddy (Take a Nap)</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.actionRow} onPress={handleCompletePrompt}>
            <Ionicons name="ribbon-outline" size={20} color={Colors.success} />
            <Text style={styles.actionRowText}>Complete & Retire to Hall of Fame</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.actionRow} onPress={handleAbandonPrompt}>
            <Ionicons name="skull-outline" size={20} color="#DC2626" />
            <Text style={[styles.actionRowText, { color: '#DC2626' }]}>
              Abandon Goal (Moves to Graveyard)
            </Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.actionRow} onPress={handleDeletePrompt}>
            <Ionicons name="trash-outline" size={20} color={Colors.textMuted} />
            <Text style={[styles.actionRowText, { color: Colors.textMuted }]}>Delete Permanently</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Cross-Platform Pause Modal */}
      <Modal
        visible={isPauseModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPauseModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pause Buddy (Take a Nap)</Text>
            <Text style={styles.modalDesc}>
              {`Life happens! Whether you're recovering from an injury (like a torn ACL) or going on vacation, pausing preserves your health with zero penalties.`}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Why are you pausing? (optional reflection)"
              placeholderTextColor={Colors.textMuted}
              value={pauseReason}
              onChangeText={setPauseReason}
              multiline
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsPauseModalOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmPause}
              >
                <Text style={styles.modalConfirmText}>Pause Buddy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHeader: {
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  goalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 12,
    textAlign: 'center',
  },
  goalWhy: {
    fontSize: 14,
    fontStyle: 'italic',
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  devCard: {
    marginTop: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    borderRadius: 12,
    width: '100%',
  },
  devHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  devStepperRow: {
    flexDirection: 'row',
    gap: 6,
  },
  devStepBtn: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  devStepBtnText: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#334155',
  },
  devText: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#0F172A',
  },
  devSubText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#64748B',
    marginTop: 2,
    marginBottom: 8,
  },
  devPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
    width: '100%',
  },
  devPresetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  devPresetBtnActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  devPresetText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  devPresetTextActive: {
    color: '#0369A1',
    fontWeight: '700',
  },
  devNotifBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
    width: '100%',
  },
  devNotifBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  openPill: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  openPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.success,
  },
  opensLaterText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  checkInCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  checkInPrompt: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 14,
  },
  ratingsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  ratingBtn: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ratingSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  ratingIconContainer: {
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  ratingTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  ratingSub: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  noteInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    marginBottom: 12,
  },
  submitCheckInBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitCheckInText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  lockedCheckInCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  lockedText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  lockedSubText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  milestonesList: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  milestoneItemTitle: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  milestoneDone: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  quickLogCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickLogRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  quickAmountInput: {
    width: 48,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    textAlign: 'center',
    paddingVertical: 8,
    fontWeight: '700',
  },
  quickNoteInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  quickLogBtn: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stakeCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  stakeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
  stakeBody: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#7F1D1D',
    marginVertical: 4,
  },
  stakeNotice: {
    fontSize: 11,
    color: '#B91C1C',
  },
  actionsCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  actionRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: 14,
  },
  modalInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  modalConfirmBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
