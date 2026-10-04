import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getDb } from '../db/client.ts';
import * as schema from '../db/schema.ts';

export interface BackupData {
  version: 1;
  exportedAt: number;
  goals: (typeof schema.goals.$inferSelect)[];
  milestones: (typeof schema.milestones.$inferSelect)[];
  progressLogs: (typeof schema.progressLogs.$inferSelect)[];
  checkIns: (typeof schema.checkIns.$inferSelect)[];
  events: (typeof schema.events.$inferSelect)[];
  settings: (typeof schema.appSettings.$inferSelect)[];
}

export async function exportBackup(): Promise<string> {
  const db = getDb();

  const data: BackupData = {
    version: 1,
    exportedAt: Date.now(),
    goals: await db.select().from(schema.goals),
    milestones: await db.select().from(schema.milestones),
    progressLogs: await db.select().from(schema.progressLogs),
    checkIns: await db.select().from(schema.checkIns),
    events: await db.select().from(schema.events),
    settings: await db.select().from(schema.appSettings),
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const fileName = `accountabilibuddy-backup-${new Date().toISOString().split('T')[0]}.json`;

  const backupFile = new File(Paths.cache, fileName);
  if (backupFile.exists) {
    backupFile.delete();
  }
  backupFile.create();
  backupFile.write(jsonStr);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(backupFile.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Export Accountabilibuddy Data',
      UTI: 'public.json',
    });
  }

  return backupFile.uri;
}

export async function importBackup(): Promise<{ success: boolean; goalCount: number }> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/json', '*/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return { success: false, goalCount: 0 };
  }

  const asset = result.assets[0];
  const file = new File(asset.uri);
  const content = file.textSync();
  const parsed = JSON.parse(content) as BackupData;

  if (!parsed.version || !Array.isArray(parsed.goals)) {
    throw new Error('Invalid backup file format');
  }

  const db = getDb();

  // Clear existing and replace with restored backup in order of foreign keys
  await db.delete(schema.events);
  await db.delete(schema.progressLogs);
  await db.delete(schema.checkIns);
  await db.delete(schema.milestones);
  await db.delete(schema.goals);
  await db.delete(schema.appSettings);

  if (parsed.goals.length > 0) {
    await db.insert(schema.goals).values(parsed.goals);
  }
  if (parsed.milestones && parsed.milestones.length > 0) {
    await db.insert(schema.milestones).values(parsed.milestones);
  }
  if (parsed.checkIns && parsed.checkIns.length > 0) {
    await db.insert(schema.checkIns).values(parsed.checkIns);
  }
  if (parsed.progressLogs && parsed.progressLogs.length > 0) {
    await db.insert(schema.progressLogs).values(parsed.progressLogs);
  }
  if (parsed.events && parsed.events.length > 0) {
    await db.insert(schema.events).values(parsed.events);
  }
  if (parsed.settings && parsed.settings.length > 0) {
    await db.insert(schema.appSettings).values(parsed.settings);
  }

  return { success: true, goalCount: parsed.goals.length };
}
