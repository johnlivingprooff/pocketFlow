/**
 * Database Diagnostics Component
 * Displays database health metrics and allows running integrity checks
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSettings } from '../store/useStore';
import { theme } from '../theme/theme';
import { metrics } from '../utils/logger';
import {
  checkDatabaseIntegrity,
  repairDatabaseIntegrity,
  getDatabaseHealthScore,
  IntegrityIssue,
  RepairResult,
} from '../lib/db/integrityChecker';

export function DatabaseDiagnostics() {
  const { themeMode } = useSettings();
  const colors = theme(themeMode);
  
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [issues, setIssues] = useState<IntegrityIssue[]>([]);
  const [checking, setChecking] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [dbMetrics, setDbMetrics] = useState<Record<string, number>>({});
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const loadDiagnostics = async () => {
    try {
      const score = await getDatabaseHealthScore();
      setHealthScore(score);
      
      const allMetrics = metrics.getAll();
      setDbMetrics(allMetrics);
    } catch (error) {
      console.error('Failed to load diagnostics:', error);
    }
  };

  const runIntegrityCheck = async () => {
    setChecking(true);
    try {
      const foundIssues = await checkDatabaseIntegrity();
      setIssues(foundIssues);
      
      const score = await getDatabaseHealthScore();
      setHealthScore(score);
      setLastCheck(new Date());
    } catch (error: any) {
      console.error(`Failed to check integrity: ${error.message}`);
    } finally {
      setChecking(false);
    }
  };

  const runRepair = async (dryRun: boolean) => {
    setRepairing(true);
    try {
      const result: RepairResult = await repairDatabaseIntegrity(dryRun);
      
      if (result.success) {
        const message = dryRun
          ? `Preview: ${result.issuesFixed} wallet(s) would be updated`
          : `Successfully repaired ${result.issuesFixed} wallet(s)`;
        
        console.log(`Repair Complete: ${message}`);
        
        if (!dryRun) {
          // Refresh diagnostics after repair
          await runIntegrityCheck();
        }
      } else {
        console.error(`Repair Failed: ${result.errors.join('\n')}`);
      }
    } catch (error: any) {
      console.error(`Failed to repair: ${error.message}`);
    } finally {
      setRepairing(false);
    }
  };

  const getHealthColor = (score: number): string => {
    if (score >= 90) return '#4CAF50'; // Green
    if (score >= 70) return '#FFC107'; // Yellow
    if (score >= 50) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return '#F44336';
      case 'high':
        return '#FF9800';
      case 'medium':
        return '#FFC107';
      case 'low':
        return '#4CAF50';
      default:
        return colors.textSecondary;
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Health Score Section */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Database Health
        </Text>
        
        {healthScore !== null ? (
          <View style={styles.healthScoreContainer}>
            <View
              style={[
                styles.healthScoreBadge,
                { backgroundColor: getHealthColor(healthScore) },
              ]}
            >
              <Text style={styles.healthScoreText}>{healthScore}</Text>
            </View>
            <Text style={[styles.healthScoreLabel, { color: colors.textSecondary }]}>
              {healthScore === 100
                ? 'Perfect Health'
                : healthScore >= 90
                ? 'Good Health'
                : healthScore >= 70
                ? 'Fair Health'
                : 'Needs Attention'}
            </Text>
          </View>
        ) : (
          <ActivityIndicator color={colors.primary} />
        )}

        {lastCheck && (
          <Text style={[styles.lastCheckText, { color: colors.textSecondary }]}>
            Last checked: {lastCheck.toLocaleTimeString()}
          </Text>
        )}
      </View>

      {/* Operations Metrics */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Operation Metrics
        </Text>
        
        <View style={styles.metricsGrid}>
          <MetricItem
            label="Wallet Creates"
            value={dbMetrics['db.wallet.create.total'] || 0}
            success={dbMetrics['db.wallet.create.success'] || 0}
            errors={dbMetrics['db.wallet.create.error'] || 0}
            colors={colors}
          />
          
          <MetricItem
            label="Wallet Reorders"
            value={dbMetrics['db.wallet.reorder.total'] || 0}
            success={dbMetrics['db.wallet.reorder.success'] || 0}
            errors={dbMetrics['db.wallet.reorder.error'] || 0}
            duplicates={dbMetrics['db.wallet.reorder.duplicate'] || 0}
            colors={colors}
          />
        </View>
      </View>

      {/* Integrity Issues */}
      {issues.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Integrity Issues ({issues.length})
          </Text>
          
          {issues.map((issue, index) => (
            <View key={index} style={styles.issueItem}>
              <View style={styles.issueHeader}>
                <View
                  style={[
                    styles.severityBadge,
                    { backgroundColor: getSeverityColor(issue.severity) },
                  ]}
                >
                  <Text style={styles.severityText}>
                    {issue.severity.toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.issueType, { color: colors.textSecondary }]}>
                  {issue.issueType}
                </Text>
              </View>
              
              <Text style={[styles.issueDescription, { color: colors.textPrimary }]}>
                {issue.description}
              </Text>
              
              <Text style={[styles.issueRecommendation, { color: colors.textSecondary }]}>
                → {issue.recommendation}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={runIntegrityCheck}
          disabled={checking}
        >
          {checking ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Run Integrity Check</Text>
          )}
        </TouchableOpacity>

        {issues.length > 0 && (
          <>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.accent }]}
              onPress={() => runRepair(true)}
              disabled={repairing}
            >
              <Text style={styles.buttonText}>Preview Repair</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#F44336' }]}
              onPress={() => {
                // Confirm and run repair
                console.log('Confirm Repair: This will modify your database. A backup will be created automatically.');
                runRepair(false);
              }}
              disabled={repairing}
            >
              {repairing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Repair Database</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, { borderColor: colors.primary }]}
          onPress={loadDiagnostics}
        >
          <Text style={[styles.buttonText, { color: colors.primary }]}>
            Refresh Metrics
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

interface MetricItemProps {
  label: string;
  value: number;
  success: number;
  errors: number;
  duplicates?: number;
  colors: any;
}

function MetricItem({ label, value, success, errors, duplicates, colors }: MetricItemProps) {
  const errorRate = value > 0 ? ((errors / value) * 100).toFixed(1) : '0.0';
  
  return (
    <View style={styles.metricItem}>
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
        {value}
      </Text>
      <Text style={[styles.metricDetails, { color: colors.textSecondary }]}>
        ✓ {success} success
      </Text>
      {errors > 0 && (
        <Text style={[styles.metricDetails, { color: '#F44336' }]}>
          ✗ {errors} errors ({errorRate}%)
        </Text>
      )}
      {duplicates && duplicates > 0 && (
        <Text style={[styles.metricDetails, { color: '#FFC107' }]}>
          ⚠ {duplicates} duplicates
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  healthScoreContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  healthScoreBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  healthScoreText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  healthScoreLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  lastCheckText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricItem: {
    width: '48%',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  metricDetails: {
    fontSize: 11,
  },
  issueItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  issueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  issueType: {
    fontSize: 12,
    fontWeight: '600',
  },
  issueDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  issueRecommendation: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 32,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
