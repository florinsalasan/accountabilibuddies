import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  Keyboard,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGoalStore } from '../../store/useGoalStore.ts';
import { Colors } from '../../constants/theme.ts';
import type { Category, GoalType, Cadence } from '../../domain/types.ts';

const CATEGORIES: { id: Category; label: string; icon: string; desc: string }[] = [
  { id: 'fitness', label: 'Fitness', icon: '🏋️', desc: 'Workouts, runs, stretching' },
  { id: 'finance', label: 'Finance', icon: '💰', desc: 'Saving, investing, budgeting' },
  { id: 'learning', label: 'Learning', icon: '📚', desc: 'Reading, skills, languages' },
  { id: 'creative', label: 'Creative', icon: '🎨', desc: 'Writing, art, projects' },
  { id: 'generic', label: 'General', icon: '✨', desc: 'Habits, wellness, productivity' },
];

const TYPES: { id: GoalType; label: string; desc: string }[] = [
  { id: 'simple', label: 'Simple Habit', desc: 'Check in each period: On track, Some, or None' },
  { id: 'recurring', label: 'Recurring Target', desc: 'e.g. 3 workouts/week, runs indefinitely' },
  { id: 'cumulative', label: 'Cumulative Goal', desc: 'e.g. Save $1000 total, completes when reached' },
  { id: 'milestone', label: 'Milestones', desc: 'Check off a roadmap of sequential steps' },
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CreateGoalScreen() {
  const { createGoal } = useGoalStore();
  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const focusedInputRef = useRef<string | null>(null);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => {
        if (focusedInputRef.current === 'stake') {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        } else if (focusedInputRef.current === 'reminder') {
          scrollViewRef.current?.scrollTo({ y: 440, animated: true });
        } else if (focusedInputRef.current === 'milestone') {
          scrollViewRef.current?.scrollTo({ y: 280, animated: true });
        } else if (focusedInputRef.current === 'target') {
          scrollViewRef.current?.scrollTo({ y: 180, animated: true });
        }
      }, 50);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleScrollToEnd = () => {
    focusedInputRef.current = 'stake';
    scrollViewRef.current?.scrollToEnd({ animated: true });
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 280);
  };

  const scrollToY = (y: number, tag?: string) => {
    if (tag) focusedInputRef.current = tag;
    scrollViewRef.current?.scrollTo({ y, animated: true });
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y, animated: true });
    }, 100);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y, animated: true });
    }, 280);
  };

  const [title, setTitle] = useState('');
  const [why, setWhy] = useState('');
  const [category, setCategory] = useState<Category>('fitness');
  const [type, setType] = useState<GoalType>('recurring');
  const [targetValue, setTargetValue] = useState('3');
  const [unit, setUnit] = useState('times');
  const [cadence, setCadence] = useState<Cadence>('weekly');
  const [cadenceDay, setCadenceDay] = useState(0); // Sunday
  const [reminderHour, setReminderHour] = useState('18');
  const [reminderMinute, setReminderMinute] = useState('00');
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [stake, setStake] = useState('');
  const [milestones, setMilestones] = useState<string[]>(['Step 1', 'Step 2']);
  const [newMilestone, setNewMilestone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddMilestone = () => {
    if (!newMilestone.trim()) return;
    setMilestones([...milestones, newMilestone.trim()]);
    setNewMilestone('');
  };

  const handleRemoveMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please give your goal a title!');
      return;
    }

    try {
      setIsSubmitting(true);
      const hour = parseInt(reminderHour, 10) || 18;
      const min = parseInt(reminderMinute, 10) || 0;
      const reminderMinutes = Math.min(23, Math.max(0, hour)) * 60 + Math.min(59, Math.max(0, min));

      await createGoal({
        title,
        why,
        category,
        type,
        cadence,
        cadenceDay,
        reminderMinutes,
        targetValue: type === 'recurring' || type === 'cumulative' ? parseFloat(targetValue) || 1 : undefined,
        unit: type === 'recurring' || type === 'cumulative' ? unit : undefined,
        targetDate: targetDate ? targetDate.getTime() : undefined,
        stake: stake.trim() || undefined,
        milestoneTitles: type === 'milestone' ? milestones : undefined,
      });

      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not create goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 40 : 60 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
      {/* 1. Title & Why */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{"1. WHAT'S THE GOAL?"}</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Work out 3x a week, Save $1,000"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, styles.inputWhy]}
          placeholder="Why does this matter to you? (optional reminder)"
          value={why}
          onChangeText={setWhy}
          multiline
        />
      </View>

      {/* 2. Category */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{"2. CHOOSE YOUR BUDDY'S THEME"}</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryCard, category === cat.id && styles.categoryCardSelected]}
              onPress={() => setCategory(cat.id)}
            >
              <Text style={styles.categoryCardIcon}>{cat.icon}</Text>
              <Text style={[styles.categoryCardLabel, category === cat.id && styles.categoryCardLabelSelected]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 3. Goal Type */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>3. HOW DO YOU WANT TO MEASURE IT?</Text>
        <View style={styles.typeList}>
          {TYPES.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.typeCard, type === t.id && styles.typeCardSelected]}
              onPress={() => setType(t.id)}
            >
              <View style={styles.radio}>
                {type === t.id && <View style={styles.radioDot} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.typeTitle, type === t.id && styles.typeTitleSelected]}>
                  {t.label}
                </Text>
                <Text style={styles.typeDesc}>{t.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {(type === 'recurring' || type === 'cumulative') && (
          <View style={styles.rowInputs}>
            <View style={{ flex: 1 }}>
              <Text style={styles.subLabel}>Target Amount</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={targetValue}
                onChangeText={setTargetValue}
                onFocus={() => scrollToY(180, 'target')}
                onBlur={() => {
                  if (focusedInputRef.current === 'target') focusedInputRef.current = null;
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.subLabel}>Unit</Text>
              <TextInput
                style={styles.input}
                placeholder="times, $, km"
                value={unit}
                onChangeText={setUnit}
                onFocus={() => scrollToY(180, 'target')}
                onBlur={() => {
                  if (focusedInputRef.current === 'target') focusedInputRef.current = null;
                }}
              />
            </View>
          </View>
        )}

        {type === 'milestone' && (
          <View style={styles.milestonesSection}>
            <Text style={styles.subLabel}>Milestone Steps</Text>
            {milestones.map((m, idx) => (
              <View key={idx} style={styles.milestoneRow}>
                <Text style={styles.milestoneNumber}>{idx + 1}.</Text>
                <Text style={styles.milestoneText}>{m}</Text>
                <TouchableOpacity onPress={() => handleRemoveMilestone(idx)}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.addMilestoneRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Add another step..."
                value={newMilestone}
                onChangeText={setNewMilestone}
                onFocus={() => scrollToY(280, 'milestone')}
                onBlur={() => {
                  if (focusedInputRef.current === 'milestone') focusedInputRef.current = null;
                }}
              />
              <TouchableOpacity style={styles.addBtn} onPress={handleAddMilestone}>
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* 4. Cadence & Reminder */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>4. CHECK-IN FREQUENCY</Text>
        <View style={styles.cadenceRow}>
          {(['daily', 'weekly', 'monthly'] as Cadence[]).map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.cadenceBtn, cadence === c && styles.cadenceBtnSelected]}
              onPress={() => setCadence(c)}
            >
              <Text style={[styles.cadenceText, cadence === c && styles.cadenceTextSelected]}>
                {c.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {cadence === 'weekly' && (
          <View style={styles.weekdayPicker}>
            <Text style={styles.subLabel}>Check in on:</Text>
            <View style={styles.weekdayRow}>
              {WEEKDAYS.map((d, index) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.dayBtn, cadenceDay === index && styles.dayBtnSelected]}
                  onPress={() => setCadenceDay(index)}
                >
                  <Text style={[styles.dayText, cadenceDay === index && styles.dayTextSelected]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {cadence === 'monthly' && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.subLabel}>Day of the month (1-31):</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={String(cadenceDay || 1)}
              onChangeText={(txt) => setCadenceDay(parseInt(txt, 10) || 1)}
            />
          </View>
        )}

        <Text style={[styles.subLabel, { marginTop: 12 }]}>Reminder Time (24h format HH:MM):</Text>
        <View style={styles.timeInputsRow}>
          <TextInput
            style={[styles.input, styles.timeInput]}
            placeholder="18"
            keyboardType="numeric"
            maxLength={2}
            value={reminderHour}
            onChangeText={setReminderHour}
            onFocus={() => scrollToY(440, 'reminder')}
            onBlur={() => {
              if (focusedInputRef.current === 'reminder') focusedInputRef.current = null;
            }}
          />
          <Text style={styles.timeColon}>:</Text>
          <TextInput
            style={[styles.input, styles.timeInput]}
            placeholder="00"
            keyboardType="numeric"
            maxLength={2}
            value={reminderMinute}
            onChangeText={setReminderMinute}
            onFocus={() => scrollToY(440, 'reminder')}
            onBlur={() => {
              if (focusedInputRef.current === 'reminder') focusedInputRef.current = null;
            }}
          />
        </View>
      </View>

      {/* 4.5 Timeline / End Date */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>TARGET DATE (OPTIONAL)</Text>
        <Text style={styles.sectionDesc}>Does this goal have a deadline? Leave blank for indefinite habits.</Text>
        <TouchableOpacity 
          style={styles.input} 
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={{ color: targetDate ? Colors.text : Colors.textMuted }}>
            {targetDate ? targetDate.toLocaleDateString() : 'No deadline (Indefinite)'}
          </Text>
        </TouchableOpacity>
        {targetDate && (
          <TouchableOpacity onPress={() => setTargetDate(undefined)}>
            <Text style={{ color: Colors.danger, fontSize: 13, marginTop: 4 }}>Clear Deadline</Text>
          </TouchableOpacity>
        )}
        
        {showDatePicker && (
          <DateTimePicker
            value={targetDate || new Date()}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selectedDate) setTargetDate(selectedDate);
            }}
          />
        )}
      </View>

      {/* 5. Stakes */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>5. SELF-SET STAKES (HONOR SYSTEM)</Text>
        <Text style={styles.sectionDesc}>
          What consequence will you pay if you abandon this goal or let your buddy perish?
        </Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Donate $25 to charity, No dessert for 2 weeks"
          value={stake}
          onChangeText={setStake}
          onFocus={handleScrollToEnd}
          onBlur={() => {
            if (focusedInputRef.current === 'stake') {
              focusedInputRef.current = null;
            }
          }}
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && { opacity: 0.6 }]}
        disabled={isSubmitting}
        onPress={handleSubmit}
      >
        <Text style={styles.submitButtonText}>Bring My Buddy To Life! 🚀</Text>
      </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 70,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  sectionDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 8,
    lineHeight: 18,
  },
  subLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 10,
  },
  inputWhy: {
    minHeight: 65,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    flexBasis: '31%',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  categoryCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  categoryCardIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  categoryCardLabelSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  typeList: {
    gap: 8,
    marginBottom: 12,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  typeCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  typeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  typeTitleSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  typeDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  milestonesSection: {
    marginTop: 8,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  milestoneNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  milestoneText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  addMilestoneRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  addBtn: {
    backgroundColor: Colors.primary,
    width: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cadenceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cadenceBtn: {
    flex: 1,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cadenceBtnSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  cadenceText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  cadenceTextSelected: {
    color: '#FFFFFF',
  },
  weekdayPicker: {
    marginTop: 12,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayBtnSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
  timeInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInput: {
    width: 60,
    textAlign: 'center',
    marginBottom: 0,
    fontWeight: '700',
  },
  timeColon: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
