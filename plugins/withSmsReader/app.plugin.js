/**
 * withSmsReader - Expo config plugin for Android SMS transaction monitoring.
 *
 * What it does:
 * 1. Adds READ_SMS + RECEIVE_SMS permissions to the AndroidManifest.
 * 2. Registers the SmsIncomingReceiver (SMS_RECEIVED broadcast) and the
 *    SmsHeadlessTaskService (RN HeadlessJsTaskService) in the manifest.
 * 3. Writes the two Java sources into the app's package (sms subpackage).
 *
 * Flow: SMS arrives -> SmsIncomingReceiver extracts body/sender -> starts
 * SmsHeadlessTaskService -> RN boots a headless JS context -> the registered
 * "SmsTransactionTask" runs -> message is parsed and stored as a PENDING
 * transaction. See src/lib/services/smsTransactionService.ts.
 *
 * Notes:
 * - Requires a development build (npx expo prebuild / eas build). Does NOT
 *   work in Expo Go.
 * - Headless JS on the New Architecture is supported on RN >= 0.76.1
 *   (this project is on 0.81). If a custom build still fails with
 *   "startHeadlessTask not registered as callable", disable new arch in
 *   app.json (newArchEnabled: false) as a fallback.
 * - Google Play restricts READ_SMS distribution; fine for personal builds.
 */

const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const RECEIVER_CLASS = 'sms.SmsIncomingReceiver';
const SERVICE_CLASS = 'sms.SmsHeadlessTaskService';
const SMS_RECEIVED_ACTION = 'android.provider.Telephony.SMS_RECEIVED';

function permissionExists(manifest, name) {
  const permissions = manifest.manifest['uses-permission'] || [];
  return permissions.some((permission) => permission.$?.['android:name'] === name);
}

function addPermission(manifest, name) {
  if (permissionExists(manifest, name)) return;
  if (!manifest.manifest['uses-permission']) manifest.manifest['uses-permission'] = [];
  manifest.manifest['uses-permission'].push({
    $: { 'android:name': name },
  });
}

function addReceiverAndService(manifest, packageName) {
  const app = manifest.manifest.application?.[0];
  if (!app) throw new Error('withSmsReader: could not find <application> in AndroidManifest');

  const receiverName = `${packageName}.${RECEIVER_CLASS}`;
  const receivers = app.receiver || [];
  if (!receivers.some((receiver) => receiver.$?.['android:name'] === receiverName)) {
    receivers.push({
      $: { 'android:name': receiverName, 'android:exported': 'true' },
      'intent-filter': [
        {
          $: { 'android:priority': '999' },
          action: [{ $: { 'android:name': SMS_RECEIVED_ACTION } }],
        },
      ],
    });
  }
  app.receiver = receivers;

  const serviceName = `${packageName}.${SERVICE_CLASS}`;
  const services = app.service || [];
  if (!services.some((service) => service.$?.['android:name'] === serviceName)) {
    services.push({
      $: { 'android:name': serviceName, 'android:exported': 'false' },
    });
  }
  app.service = services;
}

function withSmsAndroidManifest(config) {
  return withAndroidManifest(config, (config) => {
    addPermission(config.modResults, 'android.permission.READ_SMS');
    addPermission(config.modResults, 'android.permission.RECEIVE_SMS');
    addReceiverAndService(config.modResults, config.android.package);
    return config;
  });
}

function receiverJavaSource(packageName) {
  return `package ${packageName}.sms;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.provider.Telephony;
import android.telephony.SmsMessage;

import com.facebook.react.HeadlessJsTaskService;

/**
 * Woken by the system for every incoming SMS (SMS_RECEIVED broadcast).
 * Extracts the sender + body and hands them to the headless task service,
 * which boots a minimal React Native JS context.
 */
public final class SmsIncomingReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    if (intent == null || !Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) {
      return;
    }

    SmsMessage[] messages = Telephony.Sms.Intents.getMessagesFromIntent(intent);
    if (messages == null || messages.length == 0) {
      return;
    }

    StringBuilder body = new StringBuilder();
    String sender = null;
    for (SmsMessage message : messages) {
      if (message == null) continue;
      if (sender == null) sender = message.getOriginatingAddress();
      body.append(message.getMessageBody());
    }

    if (sender == null || body.length() == 0) {
      return;
    }

    Intent service = new Intent(context, SmsHeadlessTaskService.class);
    service.putExtra("sender", sender);
    service.putExtra("body", body.toString());
    service.putExtra("receivedAt", System.currentTimeMillis());
    context.startService(service);

    // Keep the device awake until the headless JS task has finished.
    HeadlessJsTaskService.acquireWakeLockNow(context);
  }
}
`;
}

function headlessServiceJavaSource(packageName) {
  return `package ${packageName}.sms;

import android.content.Intent;
import android.os.Bundle;

import androidx.annotation.Nullable;

import com.facebook.react.HeadlessJsTaskService;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.jstasks.HeadlessJsTaskConfig;

/**
 * Runs the registered "SmsTransactionTask" headless task in a bare JS
 * context. The task (src/lib/services/smsTransactionService.ts) parses the
 * message and stores it as a pending transaction.
 */
public final class SmsHeadlessTaskService extends HeadlessJsTaskService {
  public static final String TASK_NAME = "SmsTransactionTask";

  @Override
  protected @Nullable HeadlessJsTaskConfig getTaskConfig(Intent intent) {
    Bundle extras = intent.getExtras();
    if (extras == null) {
      return null;
    }

    WritableMap data = Arguments.createMap();
    data.putString("sender", extras.getString("sender", ""));
    data.putString("body", extras.getString("body", ""));
    data.putDouble("receivedAt", (double) extras.getLong("receivedAt", System.currentTimeMillis()));

    // allowedInForeground=true so SMS arriving while the app is open is
    // also captured (deduplication happens on the JS side via dedupe_key).
    return new HeadlessJsTaskConfig(TASK_NAME, data, 15000, true);
  }
}
`;
}

function withSmsJavaSources(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const packageName = config.android.package;
      const packagePath = packageName.replace(/\./g, '/');
      const smsDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        packagePath,
        'sms'
      );

      fs.mkdirSync(smsDir, { recursive: true });
      fs.writeFileSync(path.join(smsDir, 'SmsIncomingReceiver.java'), receiverJavaSource(packageName));
      fs.writeFileSync(path.join(smsDir, 'SmsHeadlessTaskService.java'), headlessServiceJavaSource(packageName));

      return config;
    },
  ]);
}

module.exports = function withSmsReader(config) {
  config = withSmsAndroidManifest(config);
  config = withSmsJavaSources(config);
  return config;
};
