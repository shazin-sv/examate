import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { db } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function requestNotificationPermission() {
  if (Platform.OS === 'web') return false;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

export async function scheduleDailyReminder(hour, minute) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to study',
      body: 'Open Examate and check today\'s plan',
      sound: true,
    },
    trigger: {
      type: 'daily',
      hour,
      minute,
    },
  });
}

export async function scheduleExamReminders() {
  const exams = await db.getExams();
  const now = new Date();
  for (const exam of exams) {
    const examDate = new Date(exam.date);
    const diff = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));
    if (diff > 0 && diff <= 30) {
      const reminders = [
        { days: 30, msg: `${exam.name} is in 30 days` },
        { days: 14, msg: `${exam.name} is in 2 weeks` },
        { days: 7, msg: `${exam.name} is in 1 week` },
        { days: 3, msg: `${exam.name} is in 3 days` },
        { days: 1, msg: `${exam.name} is tomorrow` },
      ];
      for (const r of reminders) {
        if (diff === r.days) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Exam Reminder',
              body: r.msg,
              sound: true,
            },
            trigger: {
              type: 'daily',
              hour: 9,
              minute: 0,
              channelId: 'exam-reminders',
            },
          });
        }
      }
    }
  }
}

export async function scheduleRevisionReminder() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Revision Time',
      body: 'You have chapters to revise today',
      sound: true,
    },
    trigger: {
      type: 'daily',
      hour: 18,
      minute: 0,
    },
  });
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getScheduledReminders() {
  const notifications = await Notifications.getAllScheduledNotificationsAsync();
  return notifications;
}

export async function setNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('study-reminders', {
      name: 'Study Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('exam-reminders', {
      name: 'Exam Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }
}
