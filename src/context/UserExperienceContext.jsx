import React, { createContext, useContext, useState, useEffect } from 'react';

const UserExperienceContext = createContext();

export const useUserExperience = () => {
    return useContext(UserExperienceContext);
};

export const UserExperienceProvider = ({ children }) => {
    const [preferences, setPreferences] = useState(() => {
        try {
            const stored = localStorage.getItem('bmsg_user_experience');
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error("Failed to parse stored preferences:", e);
        }
        return { mainDegree: null, subDegree: null };
    });

    const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);

    useEffect(() => {
        if (!preferences.subDegree) {
            const hasPrompted = sessionStorage.getItem('bmsg_prompted_personalize');
            if (!hasPrompted) {
                const timer = setTimeout(() => {
                    setIsCustomizeModalOpen(true);
                    sessionStorage.setItem('bmsg_prompted_personalize', 'true');
                }, 3000);
                return () => clearTimeout(timer);
            }
        }
    }, [preferences.subDegree]);

    useEffect(() => {
        try {
            localStorage.setItem('bmsg_user_experience', JSON.stringify(preferences));
        } catch (e) {
            console.error("Failed to save preferences:", e);
        }
    }, [preferences]);

    const savePreferences = (mainDegree, subDegree) => {
        setPreferences({ mainDegree, subDegree });
    };

    const clearPreferences = () => {
        setPreferences({ mainDegree: null, subDegree: null });
    };

    const openCustomizeModal = () => setIsCustomizeModalOpen(true);
    const closeCustomizeModal = () => setIsCustomizeModalOpen(false);

    const value = {
        preferences,
        savePreferences,
        clearPreferences,
        isCustomizeModalOpen,
        openCustomizeModal,
        closeCustomizeModal
    };

    return (
        <UserExperienceContext.Provider value={value}>
            {children}
        </UserExperienceContext.Provider>
    );
};
