
'use server';

import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export const sendNotification = async (
  userId: string,
  type: 'application_received' | 'application_accepted' | 'application_rejected' | 'message',
  title: string,
  message: string,
  link: string,
  projectId?: string,
  projectTitle?: string
) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const newNotificationRef = doc(notificationsRef);
    
    await setDoc(newNotificationRef, {
      recipientId: userId, // Changed to recipientId to match header query
      type,
      title,
      message,
      link,
      projectId: projectId || null,
      projectTitle: projectTitle || null,
      isRead: false, // Changed to isRead to match header
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

// Specific notification helpers
export const notifyApplicationReceived = (projectOwnerId: string, projectId: string, projectTitle: string, applicantName: string) => {
  return sendNotification(
    projectOwnerId,
    'application_received',
    'New Application Received',
    `${applicantName} has applied to your project "${projectTitle}"`,
    `/projects/${projectId}/applicants`,
    projectId,
    projectTitle
  );
};

export const notifyApplicationAccepted = (testerId: string, projectId: string, projectTitle: string) => {
  return sendNotification(
    testerId,
    'application_accepted',
    'Application Accepted!',
    `Your application for "${projectTitle}" has been accepted.`,
    `/profile/my-applications`,
    projectId,
    projectTitle
  );
};

export const notifyApplicationRejected = (testerId: string, projectId: string, projectTitle: string) => {
  return sendNotification(
    testerId,
    'application_rejected',
    'Application Update',
    `Your application for "${projectTitle}" was not selected this time.`,
    `/profile/my-applications`,
    projectId,
    projectTitle
  );
};
