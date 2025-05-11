
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, deleteField, collection, writeBatch } from 'firebase/firestore';
import { db } from './client';
import type { Tab, TabGroup } from '@/types';
import type { UserSettings } from '@/types/settings';

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
    const docSnap = await getDoc(userProfileRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfileData;
    } else {
      // console.log("No such user profile document!");
      // Optionally create a default profile here if one doesn't exist
      const defaultProfile: UserProfileData = {
        tabs: [],
        tabGroups: [],
        settings: {
          geminiApiKey: '',
          autoCloseInactiveTabs: false,
          inactiveThreshold: 30,
          aiPreferences: '',
          locale: 'en', // Default locale
          theme: 'system',
        }
      };
      await setDoc(userProfileRef, defaultProfile);
      return defaultProfile;
    }
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
};

// Updates parts of the user profile or creates it if it doesn't exist
export const updateUserProfile = async (userId: string, data: Partial<UserProfileData>): Promise<boolean> => {
  if (!userId) return false;
  try {
    const userProfileRef = doc(db, USER_PROFILES_COLLECTION, userId);
    await setDoc(userProfileRef, data, { merge: true }); // Use set with merge to create or update
    return true;
  } catch (error) {
    console.error("Error updating user profile:", error);
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

// Example: Add a single tab (more granular control if needed)
export const addTabToUserProfile = async (userId: string, tab: Tab): Promise<boolean> => {
    if (!userId) return false;
    try {
        const userProfileRef = doc(db, USER_PROFILES_COLLECTION, userId);
        await updateDoc(userProfileRef, {
            tabs: arrayUnion(tab)
        });
        return true;
    } catch (error) {
        console.error("Error adding tab to user profile:", error);
        // If the document or field doesn't exist, arrayUnion might fail. 
        // Consider setDoc with merge:true as a fallback or ensure profile exists.
        try {
            await setDoc(userProfileRef, { tabs: [tab] }, { merge: true });
            return true;
        } catch (fallbackError) {
            console.error("Error setting tab in user profile (fallback):", fallbackError);
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
    console.warn("removeTabFromUserProfile is a placeholder. Full array update via saveUserTabs is preferred for simplicity.");
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
    await setDoc(userProfileRef, defaultProfile);
    return true;
  } catch (error) {
    console.error("Error resetting user data:", error);
    return false;
  }
};
