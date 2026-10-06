import fs from 'node:fs';
import path from 'node:path';

// 1. Patch warnOfExpoGoPushUsage.js to prevent throw on Android
const warnFile = path.resolve('node_modules/expo-notifications/build/warnOfExpoGoPushUsage.js');
if (fs.existsSync(warnFile)) {
  let content = fs.readFileSync(warnFile, 'utf8');
  if (content.includes('throw new Error(message);')) {
    content = content.replace('throw new Error(message);', 'console.warn(message);');
    fs.writeFileSync(warnFile, content, 'utf8');
    console.log('Successfully patched warnOfExpoGoPushUsage.js for Expo Go!');
  }
}

// 2. Patch TopicSubscriptionModule.android.js to fallback to mock when module is missing in Expo Go
const topicFile = path.resolve('node_modules/expo-notifications/build/TopicSubscriptionModule.android.js');
if (fs.existsSync(topicFile)) {
  let content = fs.readFileSync(topicFile, 'utf8');
  if (!content.includes('requireOptionalNativeModule')) {
    const mockContent = `import { requireNativeModule } from 'expo-modules-core';
let mod;
try {
  mod = requireNativeModule('ExpoTopicSubscriptionModule');
} catch {
  mod = {
    addListener: () => {},
    removeListeners: () => {},
    subscribeToTopicAsync: () => Promise.resolve(null),
    unsubscribeFromTopicAsync: () => Promise.resolve(null),
  };
}
export default mod;
`;
    fs.writeFileSync(topicFile, mockContent, 'utf8');
    console.log('Successfully patched TopicSubscriptionModule.android.js for Expo Go!');
  }
}
