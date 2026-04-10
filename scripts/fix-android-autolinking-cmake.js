const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const cmakePath = path.join(
  root,
  'android',
  'app',
  'build',
  'generated',
  'autolinking',
  'src',
  'main',
  'jni',
  'Android-autolinking.cmake'
);

if (!fs.existsSync(cmakePath)) {
  console.log('[fix-android-autolinking-cmake] No generated Android-autolinking.cmake found, skipping.');
  process.exit(0);
}

const original = fs.readFileSync(cmakePath, 'utf8');

const patched = original.replace(
  /add_subdirectory\(([^\s]+)\s+([^\)]+)\)/g,
  (_match, srcDir, binDir) => `if(EXISTS ${srcDir}/CMakeLists.txt)\n  add_subdirectory(${srcDir} ${binDir})\nendif()`
);

if (patched !== original) {
  fs.writeFileSync(cmakePath, patched);
  console.log('[fix-android-autolinking-cmake] Patched generated Android-autolinking.cmake to skip missing codegen dirs.');
} else {
  console.log('[fix-android-autolinking-cmake] No patch changes were needed.');
}
