import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const SiteConfigContext = createContext();

export const SiteConfigProvider = ({ children }) => {
    const [config, setConfig] = useState({
        SITE_LOGO: null,
        SITE_TITLE: 'Book My Study Guide',
        SITE_DESCRIPTION: 'Your ultimate destination for comprehensive study materials.',
        SITE_KEYWORDS: 'study guide, exam prep, academic success',
        SITE_PAYMENT_MODE: 'BOTH',
        POLICY_SHIPPING: '',
        POLICY_RETURNS: '',
        POLICY_TERMS: '',
        GOOGLE_ANALYTICS_ID: null,
        GA_PROPERTY_ID: null,
        GA_SERVICE_ACCOUNT: null
    });
    const [loading, setLoading] = useState(true);

    const fetchConfig = React.useCallback(async () => {
        try {
            const res = await api.get('/api/config/site-settings');
            if (res.data?.success) {
                setConfig(prev => {
                    const newConfig = { ...prev };
                    res.data.data.forEach(item => {
                        newConfig[item.key] = item.value;
                    });
                    return newConfig;
                });
            }
        } catch (err) {
            console.error("Error fetching site configuration:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    return (
        <SiteConfigContext.Provider value={{ config, loading, refreshConfig: fetchConfig }}>
            {children}
        </SiteConfigContext.Provider>
    );
};

export const useSiteConfig = () => useContext(SiteConfigContext);
