import React, { createContext } from 'react';
import { User, Notification } from '../types';

interface AppContextType {
    currentUser: User | null;
    setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
    showNotification: (message: string, type?: 'success' | 'error' | 'warning') => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider = AppContext.Provider;