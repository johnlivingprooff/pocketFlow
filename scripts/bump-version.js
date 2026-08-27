#!/usr/bin/env node
/**
 * Bump the pocketFlow build version to today's date (or a given date).
 *
 * Updates every place the version appears:
 *   - app.json                (expo.version, ios.buildNumber, android.versionCode)
 *   - package.json            (version)
 *   - package-lock.json       (version)
 *   - eas.json                (APP_VERSION_NAME / APP_VERSION_CODE for all profiles)
 *   - app/(tabs)/settings.tsx (APP_VERSION const)
 *   - webpage/lib/links.ts    (RELEASE_VERSION / RELEASE_FILENAME)
 *   - android/app/build.gradle (versionCode, versionName — what Android Settings shows)
 *   - ios/pocketFlow/Info.plist (CFBundleShortVersionString, CFBundleVersion)
 *
 * The native files are updated by pattern (not by old-value lookup), so they
 * stay in sync even if a previous bump missed them.
 *
 * Usage:
 *   node scripts/bump-version.js                # use today's date
 *   node scripts/bump-version.js 2026-09-01     # use a specific date
 *   node scripts/bump-version.js 2026.9.1       # same, dotted form
 *   node scripts/bump-version.js --dry-run      # show changes without writing
 *   node scripts/bump-version.js --force        # allow a non-increasing versionCode
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const FILES = [
  'app.json',
  'package.json',
  'package-lock.json',
  'eas.json',
  'app/(tabs)/settings.tsx',
  'webpage/lib/links.ts',
];

function readFile(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function writeFile(rel, contents) {
  fs.writeFileSync(path.join(ROOT, rel), contents);
}

function readJson(rel) {
  return JSON.parse(readFile(rel));
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function parseDateArg(raw) {
  if (!raw) return null;
  const dotted = raw.match(/^(\d{4})[.\-](\d{1,2})[.\-](\d{1,2})$/);
  if (dotted) {
    const [, y, m, d] = dotted.map(Number);
    return { y, m, d };
  }
  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) {
    const [, y, m, d] = compact.map(Number);
    return { y, m, d };
  }
  throw new Error(`Could not parse date "${raw}". Use YYYY.M.D, YYYY-MM-DD, or YYYYMMDD.`);
}

function resolveTarget() {
  const args = process.argv.slice(2);
  const opts = { dryRun: args.includes('--dry-run'), force: args.includes('--force') };
  const raw = args.find((a) => !a.startsWith('--')) ?? null;
  let target;
  if (raw) {
    target = parseDateArg(raw);
  } else {
    const now = new Date();
    target = { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
  }
  const { y, m, d } = target;
  return {
    version: `${y}.${m}.${d}`,
    versionCode: `${y}${pad(m)}${pad(d)}`,
    ...opts,
  };
}

function updateAndroidGradle(contents, newVersion, newVersionCode) {
  let updated = contents
    .replace(/versionCode\s+\d+/, `versionCode ${newVersionCode}`)
    .replace(/versionName\s+"[^"]*"/, `versionName "${newVersion}"`);
  if (!/versionName\s+"/.test(updated)) {
    throw new Error('android/app/build.gradle: could not locate versionName entry.');
  }
  if (!/versionCode\s+\d+/.test(updated)) {
    throw new Error('android/app/build.gradle: could not locate versionCode entry.');
  }
  return updated;
}

function updateIosInfoPlist(contents, newVersion, newVersionCode) {
  const shortRe = /(<key>CFBundleShortVersionString<\/key>\s*<string>)[^<]*(<\/string>)/;
  const buildRe = /(<key>CFBundleVersion<\/key>\s*<string>)[^<]*(<\/string>)/;
  if (!shortRe.test(contents)) {
    throw new Error('ios/pocketFlow/Info.plist: could not locate CFBundleShortVersionString.');
  }
  if (!buildRe.test(contents)) {
    throw new Error('ios/pocketFlow/Info.plist: could not locate CFBundleVersion.');
  }
  return contents.replace(shortRe, `$1${newVersion}$2`).replace(buildRe, `$1${newVersionCode}$2`);
}

function applyNativeUpdates(rel, newVersion, newVersionCode) {
  const original = readFile(rel);
  const updated =
    rel.endsWith('.gradle')
      ? updateAndroidGradle(original, newVersion, newVersionCode)
      : updateIosInfoPlist(original, newVersion, newVersionCode);
  return { original, updated };
}

function main() {
  const target = resolveTarget();

  const appJson = readJson('app.json');
  const oldVersion = appJson.expo.version;
  const oldVersionCode = String(appJson.expo.android.versionCode);

  const newVersion = target.version;
  const newVersionCode = target.versionCode;

  if (newVersion === oldVersion) {
    throw new Error(`Version is already ${oldVersion} - nothing to do.`);
  }
  if (!target.force && Number(newVersionCode) <= Number(oldVersionCode)) {
    throw new Error(
      `New versionCode ${newVersionCode} is not greater than current ${oldVersionCode}. ` +
        'Android requires increasing version codes (Play Store). Use --force to override.'
    );
  }

  console.log(`Bumping ${oldVersion} (code ${oldVersionCode}) -> ${newVersion} (code ${newVersionCode})`);
  if (target.dryRun) console.log('[dry-run] no files will be written.\n');

  for (const rel of FILES) {
    const original = readFile(rel);
    let updated = original
      .split(oldVersion).join(newVersion)
      .split(oldVersionCode).join(newVersionCode);

    if (updated === original) {
      console.log(`  - ${rel}: no change`);
      continue;
    }
    if (target.dryRun) {
      console.log(`  - ${rel}: would update`);
    } else {
      writeFile(rel, updated);
      console.log(`  - ${rel}: updated`);
    }
  }

  const NATIVE_FILES = [
    'android/app/build.gradle',
    'ios/pocketFlow/Info.plist',
  ];
  for (const rel of NATIVE_FILES) {
    if (!fs.existsSync(path.join(ROOT, rel))) {
      console.log(`  - ${rel}: skipped (missing)`);
      continue;
    }
    try {
      const { original, updated } = applyNativeUpdates(rel, newVersion, newVersionCode);
      if (updated === original) {
        console.log(`  - ${rel}: no change`);
        continue;
      }
      if (target.dryRun) {
        console.log(`  - ${rel}: would update`);
      } else {
        writeFile(rel, updated);
        console.log(`  - ${rel}: updated`);
      }
    } catch (err) {
      console.warn(`  - ${rel}: WARNING ${err.message}`);
    }
  }
}

main();