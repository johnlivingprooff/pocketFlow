import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { CalendarModal } from '@/components/CalendarModal';
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useSettings } from "@/store/useStore";
import { theme } from "@/theme/theme";
import { error as logError } from "@/utils/logger";
import { createGoal } from "@/lib/db/goals";
import { getWallets } from "@/lib/db/wallets";
import type { Wallet } from "@/types/wallet";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

const formatISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return "Select date";
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return "Select date";
  const parts = dateFormatter.formatToParts(parsed);
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  return `${month}-${day}, ${year}`;
};

export default function CreateGoalScreen() {
  const router = useRouter();
  const { themeMode, defaultCurrency } = useSettings();
  const systemColorScheme = useColorScheme();
  const colors = theme(themeMode, systemColorScheme || "light");

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [startDate, setStartDate] = useState<string>(() => formatISODate(new Date()));
  const [targetDate, setTargetDate] = useState<string>(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return formatISODate(tomorrow);
  });
  const [selectedWallets, setSelectedWallets] = useState<number[]>([]);
  const [notes, setNotes] = useState("");
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showTargetPicker, setShowTargetPicker] = useState(false);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const wals = await getWallets();
      setWallets(wals);
      if (wals.length > 0) {
        setSelectedWallets([wals[0].id!]);
      }
    } catch (err: unknown) {
      logError("Failed to load wallets:", { error: err });
      Alert.alert("Error", "Failed to load wallets");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Please enter a goal name");
      return false;
    }
    if (!targetAmount.trim() || Number.isNaN(parseFloat(targetAmount)) || parseFloat(targetAmount) <= 0) {
      Alert.alert("Validation Error", "Please enter a valid target amount");
      return false;
    }
    if (!startDate.trim()) {
      Alert.alert("Validation Error", "Please enter a start date");
      return false;
    }
    if (!targetDate.trim()) {
      Alert.alert("Validation Error", "Please enter a target date");
      return false;
    }
    if (new Date(startDate) >= new Date(targetDate)) {
      Alert.alert("Validation Error", "Target date must be after start date");
      return false;
    }
    if (selectedWallets.length === 0) {
      Alert.alert("Validation Error", "Please select at least one wallet");
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      
      // Close any open modals before navigating
      setShowStartPicker(false);
      setShowTargetPicker(false);

      console.log('[Goal Create] Starting creation with data:', {
        name: name.trim(),
        targetAmount: parseFloat(targetAmount),
        startDate,
        targetDate,
        linkedWalletIds: selectedWallets,
      });

      const createdGoal = await createGoal({
        name: name.trim(),
        targetAmount: parseFloat(targetAmount),
        startDate,
        targetDate,
        linkedWalletIds: selectedWallets,
        notes: notes.trim() || undefined,
      });

      // Calculate initial progress for the new goal
      if (createdGoal.id) {
        const { recalculateGoalProgress } = await import('@/lib/db/goals');
        await recalculateGoalProgress(createdGoal.id);
      }

      console.log('[Goal Create] Goal created successfully');
      // Invalidate caches so goal page will reload with new data
      const { invalidateTransactionCaches } = await import('@/lib/cache/queryCache');
      invalidateTransactionCaches();
      Alert.alert("Success", "Goal created successfully", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('[Goal Create] Error creating goal:', error);
      logError("Failed to create goal:", { error: err });
      Alert.alert("Error", `Failed to create goal: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };



  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Goal Name *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
              placeholder="e.g., Emergency Fund"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
              editable={!saving}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Target Amount ({defaultCurrency}) *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
              placeholder="e.g., 5000"
              placeholderTextColor={colors.textSecondary}
              value={targetAmount}
              onChangeText={setTargetAmount}
              keyboardType="decimal-pad"
              editable={!saving}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Start Date *</Text>
            <Pressable
              onPress={() => setShowStartPicker(true)}
              disabled={saving}
              style={[
                styles.dateInput,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.dateText,
                  { color: startDate ? colors.textPrimary : colors.textSecondary },
                ]}
              >
                {formatDisplayDate(startDate)}
              </Text>
            </Pressable>
            {showStartPicker && (
              <CalendarModal
                visible={showStartPicker}
                onClose={() => setShowStartPicker(false)}
                onSelectDate={(date) => {
                  setStartDate(formatISODate(date));
                }}
                selectedDate={startDate ? new Date(startDate) : new Date()}
                title="Select start date"
              />
            )}
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>When do you want to start tracking this goal?</Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Target Date *</Text>
            <Pressable
              onPress={() => setShowTargetPicker(true)}
              disabled={saving}
              style={[
                styles.dateInput,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.dateText,
                  { color: targetDate ? colors.textPrimary : colors.textSecondary },
                ]}
              >
                {formatDisplayDate(targetDate)}
              </Text>
            </Pressable>
            {showTargetPicker && (
              <CalendarModal
                visible={showTargetPicker}
                onClose={() => setShowTargetPicker(false)}
                onSelectDate={(date) => {
                  setTargetDate(formatISODate(date));
                }}
                selectedDate={targetDate ? new Date(targetDate) : new Date()}
                title="Select target date"
              />
            )}
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>Select your target completion date</Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Wallets *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.walletScroll}>
              {/* All Wallets option */}
              <Pressable
                onPress={() => {
                  const allWalletIds = wallets.map(w => w.id!);
                  const isAllSelected = selectedWallets.length === wallets.length &&
                    allWalletIds.every(id => selectedWallets.includes(id));
                  if (isAllSelected) {
                    setSelectedWallets([]);
                  } else {
                    setSelectedWallets(allWalletIds);
                  }
                }}
                style={[
                  styles.walletButton,
                  {
                    backgroundColor: selectedWallets.length === wallets.length && wallets.length > 0 ? colors.primary : colors.card,
                    borderColor: colors.border,
                  },
                ]}
                disabled={saving}
              >
                <Text
                  style={[
                    styles.walletButtonText,
                    {
                      color: selectedWallets.length === wallets.length && wallets.length > 0 ? colors.background : colors.textPrimary,
                    },
                  ]}
                >
                  All Wallets
                </Text>
              </Pressable>
              {/* Individual wallet options */}
              {wallets.map((wallet) => {
                const isSelected = selectedWallets.includes(wallet.id!);
                return (
                  <Pressable
                    key={wallet.id}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedWallets(prev => prev.filter(id => id !== wallet.id));
                      } else {
                        setSelectedWallets(prev => [...prev, wallet.id!]);
                      }
                    }}
                    style={[
                      styles.walletButton,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                    disabled={saving}
                  >
                    <Text
                      style={[
                        styles.walletButtonText,
                        {
                          color: isSelected ? colors.background : colors.textPrimary,
                        },
                      ]}
                    >
                      {wallet.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {selectedWallets.length > 0 && (
              <Text style={[styles.selectionSummary, { color: colors.textSecondary }]}>
                {selectedWallets.length === wallets.length ? 'All wallets selected' : `${selectedWallets.length} wallet${selectedWallets.length === 1 ? '' : 's'} selected`}
              </Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Notes</Text>
            <TextInput
              style={[
                styles.input,
                styles.notesInput,
                {
                  backgroundColor: colors.card,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Optional notes..."
              placeholderTextColor={colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              editable={!saving}
            />
          </View>

          <Pressable
            onPress={handleCreate}
            disabled={saving}
            style={[
              styles.createButton,
              {
                backgroundColor: saving ? colors.border : colors.primary,
              },
            ]}
          >
            <Text style={[styles.createButtonText, { color: colors.background }]}>
              {saving ? "Creating..." : "Create Goal"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "500",
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    justifyContent: "center",
  },
  dateText: {
    fontSize: 15,
    fontWeight: "600",
  },
  notesInput: {
    textAlignVertical: "top",
  },
  helperText: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: "400",
  },
  selectionSummary: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: "400",
  },
  walletScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  walletButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  walletButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  createButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 32,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
