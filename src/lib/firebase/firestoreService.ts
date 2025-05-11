
import { doc, getDoc, setDoc, updateDoc, arrayUnion, DocumentSnapshot } from 'firebase/firestore';
import { db } from './client';
import type { Tab, TabGroup } from '@/types';
import type { UserSettings } from '@/types/settings';
import { withFirestoreWriteRetry, withFirestoreReadRetry } from './retryHelper';

const USER_PROFILES_COLLECTION = 'userProfiles';

export interface UserProfileData {
  tabs?: Tab[];
  tabGroups?: TabGroup[];
  settings?: UserSettings;
}

// Gets the entire user profile document
export const getUserProfile = async (userId: string): Promise<UserProfileData | null> => {
  if (!userId) return null;
  try {
    const userProfileRef = doc(db, USER_PROFILES_COLLECTION, userId);
    // Retry for getDoc
    const docSnap = await withFirestoreReadRetry<DocumentSnapshot>(() => getDoc(userProfileRef));

    if (docSnap.exists()) {
      return docSnap.data() as UserProfileData;
    } else {
      // console.log("No such user profile document! Creating default.");
      const defaultProfile: UserProfileData = {
        tabs: [],
        tabGroups: [],
        settings: {
          geminiApiKey: '',
          autoCloseInactiveTabs: false,
          inactiveThreshold: 30,
          aiPreferences: '',
          locale: 'en', 
          theme: 'system',
        }
      };
      // Retry for setDoc (creating default profile)
      await withFirestoreWriteRetry(() => setDoc(userProfileRef, defaultProfile));
      return defaultProfile;
    }
  } catch (error) {
    console.error("Error in getUserProfile (final error after retries):", error);
    return null;
  }
};

// Updates parts of the user profile or creates it if it doesn't exist
export const updateUserProfile = async (userId: string, data: Partial<UserProfileData>): Promise<boolean> => {
  if (!userId) return false;
  try {
    const userProfileRef = doc(db, USER_PROFILES_COLLECTION, userId);
    await withFirestoreWriteRetry(() => setDoc(userProfileRef, data, { merge: true }));
    return true;
  } catch (error) {
    console.error("Error updating user profile (final error after retries):", error);
    return false;
  }
};

// Specific function to save all tabs for a user
export const saveUserTabs = async (userId: string, tabs: Tab[]): Promise<boolean> => {
  if (!userId) return false;
  return updateUserProfile(userId, { tabs });
};

// Specific function to save all tab groups for a user
export const saveUserTabGroups = async (userId: string, tabGroups: TabGroup[]): Promise<boolean> => {
  if (!userId) return false;
  return updateUserProfile(userId, { tabGroups });
};

// Specific function to save user settings
export const saveUserSettings = async (userId: string, settings: UserSettings): Promise<boolean> => {
  if (!userId) return false;
  return updateUserProfile(userId, { settings });
};

// Example: Add a single tab
export const addTabToUserProfile = async (userId: string, tab: Tab): Promise<boolean> => {
    if (!userId) return false;
    const userProfileRef = doc(db, USER_PROFILES_COLLECTION, userId);
    try {
        // Attempt updateDoc with retry
        await withFirestoreWriteRetry(() => updateDoc(userProfileRef, {
            tabs: arrayUnion(tab)
        }));
        return true;
    } catch (error) {
        console.warn("Failed to updateDoc (arrayUnion), trying setDoc with merge (final error for updateDoc after retries):", error);
        // Fallback to setDoc with merge, also with retry
        try {
            await withFirestoreWriteRetry(() => setDoc(userProfileRef, { tabs: arrayUnion(tab) }, { merge: true }));
            return true;
        } catch (fallbackError) {
            console.error("Error setting tab in user profile using setDoc fallback (final error after retries):", fallbackError);
            return false;
        }
    }
};

// Example: Remove a single tab
export const removeTabFromUserProfile = async (userId: string, tabId: string): Promise<boolean> => {
    if (!userId) return false;
    // This is more complex as arrayRemove needs the exact object.
    // It's often easier to fetch, filter, and then saveUserTabs.
    // For a direct arrayRemove, you'd need the full tab object that was stored.
    // For now, let's assume the main page handles the state and calls saveUserTabs.
    console.warn("removeTabFromUserProfile is a placeholder. Full array update via saveUserTabs is preferred for simplicity with retries handled there.");
    return false;
};


export const resetUserData = async (userId: string): Promise<boolean> => {
  if (!userId) return false;
  try {
    const userProfileRef = doc(db, USER_PROFILES_COLLECTION, userId);
    const defaultProfile: UserProfileData = {
      tabs: [],
      tabGroups: [],
      settings: {
        geminiApiKey: '',
        autoCloseInactiveTabs: false,
        inactiveThreshold: 30,
        aiPreferences: '',
        locale: 'en',
        theme: 'system',
      }
    };
    await withFirestoreWriteRetry(() => setDoc(userProfileRef, defaultProfile));
    return true;
  } catch (error) {
    console.error("Error resetting user data (final error after retries):", error);
    return false;
  }
};
