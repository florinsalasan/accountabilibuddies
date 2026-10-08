import React, { useEffect, useState, useRef } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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

function getBuddyReaction(
  category: string,
  hState: string,
  lifeState?: string,
): string {
  if (lifeState === 'paused') {
    return 'Zzz... Just snoozing peacefully. Wake me when you are ready to resume!';
  }
  if (lifeState === 'completed') {
    return 'Living my best life in the Hall of Fame! You achieved something awesome!';
  }
  if (lifeState === 'dead') {
    return 'I gave my best... You can always start fresh whenever you are ready.';
  }
  if (lifeState === 'lastChance') {
    return 'EMERGENCY! Check in with progress now before I fade to the graveyard!';
  }

  if (hState === 'thriving') {
    if (category === 'fitness') return 'Feeling unstoppable! Those muscles are not gonna build themselves!';
    if (category === 'finance') return 'Cha-ching! Smart money moves only!';
    if (category === 'learning') return 'Big brain energy! What are we mastering next?';
    if (category === 'creative') return 'The muse is singing! Pure masterpiece energy!';
    return 'We are on fire! Keep this winning streak alive!';
  }

  if (hState === 'good') {
    if (category === 'fitness') return 'Ready for action! Let’s get moving today!';
    if (category === 'finance') return 'Steady progress! Future you will definitely thank us.';
    if (category === 'learning') return 'Curiosity mode on! Let’s read another chapter.';
    if (category === 'creative') return 'Creative spark is lit! Let’s build something cool.';
    return 'Looking great friend! How is today shaping up?';
  }

  if (hState === 'meh') {
    if (category === 'fitness') return 'Tapping my sneakers... don’t leave me waiting on the mat!';
    if (category === 'finance') return 'Checking the ledger... let’s stay on budget!';
    if (category === 'learning') return 'Dust on the cover... how about just 10 minutes?';
    if (category === 'creative') return 'Paint is drying... give me a quick brushstroke!';
    return 'Hey! Just checking in so we don’t fall behind.';
  }

  if (hState === 'struggling') {
    if (category === 'fitness') return 'Couch is taking over! Save me with one good workout!';
    if (category === 'finance') return 'Moths in the wallet! Help me clean up the budget!';
    if (category === 'learning') return 'Brain is getting rusty! Wake me up with some progress!';
    if (category === 'creative') return 'The muse is packing bags... quick, create something!';
    return 'Getting worried about our momentum! You’ve got this!';
  }

  // dying
  if (category === 'fitness') return 'I can’t feel my legs! Need workout life support!';
  if (category === 'finance') return 'Code red for the wallet! Check in immediately!';
  if (category === 'learning') return 'Losing braincells! Rescue me with a check-in!';
  if (category === 'creative') return 'Inspiration is flatlining! Save our buddy!';
  return 'Literally on life support! One check-in saves us!';
}

function formatActivityDate(timestamp: number) {
  const d = new Date(timestamp);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (isToday) return `Today at ${timeStr}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday at ${timeStr}`;
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
}

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
    updateGoal,
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

  // Interactive Buddy Speech Bubble
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Edit Buddy Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editWhy, setEditWhy] = useState('');
  const [editHour, setEditHour] = useState('18');
  const [editMinute, setEditMinute] = useState('00');
  const [editTargetValue, setEditTargetValue] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editStake, setEditStake] = useState('');
  const now = useCurrentTime();

  useEffect(() => {
    if (id) {
      loadGoalDetail(id);
    }
  }, [id, loadGoalDetail]);

  const recentCheckIns = activeGoalDetail?.recentCheckIns;
  const recentLogs = activeGoalDetail?.recentLogs;

  const combinedActivities = React.useMemo(() => {
    const list: {
      id: string;
      type: 'checkin' | 'log';
      timestamp: number;
      rating?: string;
      healthDelta?: number;
      amount?: number;
      note?: string | null;
    }[] = [];

    (recentCheckIns || []).forEach((c) => {
      const delta =
        c.healthAfter !== undefined && c.healthBefore !== undefined
          ? Math.round(c.healthAfter - c.healthBefore)
          : undefined;
      list.push({
        id: `ci-${c.id}`,
        type: 'checkin',
        timestamp: c.createdAt,
        rating: c.rating,
        healthDelta: delta,
        note: c.note,
      });
    });

    (recentLogs || []).forEach((l) => {
      list.push({
        id: `log-${l.id}`,
        type: 'log',
        timestamp: l.createdAt,
        amount: l.amount,
        note: l.note,
      });
    });

    list.sort((a, b) => b.timestamp - a.timestamp);
    return list.slice(0, 15);
  }, [recentCheckIns, recentLogs]);

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

  const handleAvatarTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const quote = getBuddyReaction(goal.category, hState, goal.lifeState);
    setSpeechBubble(quote);
    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    speechTimeoutRef.current = setTimeout(() => {
      setSpeechBubble(null);
    }, 4500);
  };

  const handleOpenEditModal = () => {
    setEditTitle(goal.title);
    setEditWhy(goal.why || '');
    setEditHour(String(Math.floor(goal.reminderMinutes / 60)).padStart(2, '0'));
    setEditMinute(String(goal.reminderMinutes % 60).padStart(2, '0'));
    setEditTargetValue(goal.targetValue ? String(goal.targetValue) : '');
    setEditUnit(goal.unit || '');
    setEditStake(goal.stake || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      Alert.alert('Title Required', 'Please provide a title for your buddy.');
      return;
    }
    const h = Math.max(0, Math.min(23, parseInt(editHour, 10) || 0));
    const m = Math.max(0, Math.min(59, parseInt(editMinute, 10) || 0));
    const reminderMinutes = h * 60 + m;

    await updateGoal(goal.id, {
      title: editTitle.trim(),
      why: editWhy.trim() || undefined,
      reminderMinutes,
      targetValue: editTargetValue ? parseFloat(editTargetValue) : undefined,
      unit: editUnit.trim() || undefined,
      stake: editStake.trim() || undefined,
    });
    setIsEditModalOpen(false);
    Alert.alert('Buddy Updated', 'Your buddy settings and reminders have been updated.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Big Interactive Avatar Header */}
      <View style={styles.avatarHeader}>
        <View style={styles.avatarContainer}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleAvatarTap}
            style={styles.avatarTouchArea}
          >
            <Avatar
              category={goal.category}
              healthState={hState}
              lifeState={goal.lifeState}
              size={210}
            />
          </TouchableOpacity>

          {speechBubble ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setSpeechBubble(null)}
              style={styles.speechBubble}
            >
              <Text style={styles.speechBubbleText}>{speechBubble}</Text>
              <View style={styles.speechBubbleArrow} />
            </TouchableOpacity>
          ) : null}
        </View>

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

      {/* Recent Activity / Check-in History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
        {combinedActivities.length === 0 ? (
          <View style={styles.emptyActivityCard}>
            <Ionicons name="newspaper-outline" size={24} color={Colors.textMuted} />
            <Text style={styles.emptyActivityText}>No activity recorded yet.</Text>
            <Text style={styles.emptyActivitySub}>
              Check-ins and progress updates will appear here!
            </Text>
          </View>
        ) : (
          <View style={styles.activityCard}>
            {combinedActivities.map((item, idx) => {
              const isCheckIn = item.type === 'checkin';
              const isLast = idx === combinedActivities.length - 1;

              let iconName: any = 'checkmark-circle-outline';
              let iconColor = Colors.primary;
              let iconBg = '#F1F5F9';
              let title = 'Activity logged';

              if (isCheckIn) {
                if (item.rating === 'on_track') {
                  iconName = 'rocket';
                  iconColor = Colors.success;
                  iconBg = '#DCFCE7';
                  title = 'Checked in: On Track';
                } else if (item.rating === 'some') {
                  iconName = 'thumbs-up';
                  iconColor = '#0284C7';
                  iconBg = '#E0F2FE';
                  title = 'Checked in: A Little';
                } else if (item.rating === 'none') {
                  iconName = 'hourglass';
                  iconColor = '#D97706';
                  iconBg = '#FEF3C7';
                  title = 'Checked in: Nothing Done';
                } else if (item.rating === 'missed') {
                  iconName = 'alert-circle';
                  iconColor = '#DC2626';
                  iconBg = '#FEE2E2';
                  title = 'Check-in Missed';
                }
              } else {
                iconName = 'trending-up';
                iconColor = Colors.primary;
                iconBg = Colors.primaryLight;
                title = `Progress: +${item.amount} ${goal.unit || 'pts'}`;
              }

              return (
                <View key={item.id}>
                  <View style={styles.activityItem}>
                    <View style={[styles.activityIconCircle, { backgroundColor: iconBg }]}>
                      <Ionicons name={iconName} size={18} color={iconColor} />
                    </View>
                    <View style={styles.activityContent}>
                      <View style={styles.activityHeaderRow}>
                        <Text style={styles.activityTitle}>{title}</Text>
                        {item.healthDelta !== undefined ? (
                          <Text
                            style={[
                              styles.activityDelta,
                              {
                                color:
                                  item.healthDelta > 0
                                    ? Colors.success
                                    : item.healthDelta < 0
                                    ? '#DC2626'
                                    : Colors.textMuted,
                              },
                            ]}
                          >
                            {item.healthDelta > 0 ? `+${item.healthDelta}` : `${item.healthDelta}`} hp
                          </Text>
                        ) : null}
                      </View>
                      {item.note ? <Text style={styles.activityNote}>{`"${item.note}"`}</Text> : null}
                      <Text style={styles.activityDate}>{formatActivityDate(item.timestamp)}</Text>
                    </View>
                  </View>
                  {!isLast && <View style={styles.divider} />}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Goal Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>BUDDY MANAGEMENT</Text>
        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionRow} onPress={handleOpenEditModal}>
            <Ionicons name="create-outline" size={20} color={Colors.primary} />
            <Text style={styles.actionRowText}>Edit Buddy Settings</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
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
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Buddy Modal */}
      <Modal
        visible={isEditModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <View style={styles.editModalContent}>
            <Text style={styles.modalTitle}>Edit Buddy Settings</Text>
            <ScrollView
              style={styles.editScrollView}
              contentContainerStyle={styles.editScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.editFieldLabel}>Buddy Name / Title</Text>
              <TextInput
                style={styles.editInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="e.g. Daily Reading"
                placeholderTextColor={Colors.textMuted}
              />

              <Text style={styles.editFieldLabel}>Why this matters to you</Text>
              <TextInput
                style={styles.editInput}
                value={editWhy}
                onChangeText={setEditWhy}
                placeholder="e.g. Expand knowledge & focus"
                placeholderTextColor={Colors.textMuted}
              />

              <Text style={styles.editFieldLabel}>Daily Reminder Time (24h)</Text>
              <View style={styles.timeInputRow}>
                <TextInput
                  style={styles.timeInput}
                  value={editHour}
                  onChangeText={setEditHour}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholder="HH"
                  placeholderTextColor={Colors.textMuted}
                />
                <Text style={styles.timeColon}>:</Text>
                <TextInput
                  style={styles.timeInput}
                  value={editMinute}
                  onChangeText={setEditMinute}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholder="MM"
                  placeholderTextColor={Colors.textMuted}
                />
                <Text style={styles.timeHelperText}>
                  ({editHour.padStart(2, '0')}:{editMinute.padStart(2, '0')})
                </Text>
              </View>

              {goal.type !== 'milestone' && (
                <>
                  <Text style={styles.editFieldLabel}>Target Value & Unit</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[styles.editInput, { flex: 1 }]}
                      value={editTargetValue}
                      onChangeText={setEditTargetValue}
                      keyboardType="numeric"
                      placeholder="Target"
                      placeholderTextColor={Colors.textMuted}
                    />
                    <TextInput
                      style={[styles.editInput, { flex: 1 }]}
                      value={editUnit}
                      onChangeText={setEditUnit}
                      placeholder="Unit (e.g. pages)"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                </>
              )}

              <Text style={styles.editFieldLabel}>Self-Set Stakes Consequence</Text>
              <TextInput
                style={[styles.editInput, { minHeight: 60, textAlignVertical: 'top' }]}
                value={editStake}
                onChangeText={setEditStake}
                placeholder="e.g. Clean garage or donate $25 to rival team"
                placeholderTextColor={Colors.textMuted}
                multiline
              />
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsEditModalOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleSaveEdit}
              >
                <Text style={styles.modalConfirmText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  avatarContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  speechBubble: {
    position: 'absolute',
    top: 10,
    zIndex: 10,
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    maxWidth: '92%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  speechBubbleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  speechBubbleArrow: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#1E293B',
  },
  avatarTouchArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    gap: 12,
  },
  activityIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  activityContent: {
    flex: 1,
  },
  activityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  activityDelta: {
    fontSize: 12,
    fontWeight: '700',
  },
  activityNote: {
    fontSize: 12,
    fontStyle: 'italic',
    color: Colors.textMuted,
    marginTop: 3,
  },
  activityDate: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  emptyActivityCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  emptyActivityText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  emptyActivitySub: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  editModalContent: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  editFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    marginTop: 10,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.text,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '700',
    width: 54,
    textAlign: 'center',
    color: Colors.text,
  },
  timeColon: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  timeHelperText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  editScrollView: {
    maxHeight: 280,
  },
  editScrollContent: {
    paddingBottom: 16,
  },
});
