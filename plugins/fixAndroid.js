// plugins/fixAndroid.js
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFixAndroid(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;

      // 1. Ensure gradle.properties has the exact architectures you want
      const gradlePropsPath = path.join(projectRoot, 'gradle.properties');
      let gradleProps = '';
      if (fs.existsSync(gradlePropsPath)) {
        gradleProps = fs.readFileSync(gradlePropsPath, 'utf8');
      }

      // Replace existing reactNativeArchitectures line or add it
      const archLine = 'reactNativeArchitectures=arm64-v8a,x86,x86_64';
      if (gradleProps.match(/^reactNativeArchitectures=.*$/m)) {
        gradleProps = gradleProps.replace(/^reactNativeArchitectures=.*$/m, archLine);
      } else {
        gradleProps += `\n${archLine}\n`;
      }

      fs.writeFileSync(gradlePropsPath, gradleProps, 'utf8');

      // 2. Ensure app/build.gradle has your NDK version set
      const appBuildGradlePath = path.join(projectRoot, 'android', 'app', 'build.gradle');
      if (fs.existsSync(appBuildGradlePath)) {
        let buildGradle = fs.readFileSync(appBuildGradlePath, 'utf8');

        // Match the android { ... } block and add/update ndkVersion
        const ndkLine = '    ndkVersion rootProject.ext.ndkVersion';
        if (!buildGradle.includes(ndkLine)) {
          buildGradle = buildGradle.replace(
            /android\s*\{/,
            match => `${match}\n${ndkLine}`
          );
          fs.writeFileSync(appBuildGradlePath, buildGradle, 'utf8');
        }
      }

      return config;
    },
  ]);
};
