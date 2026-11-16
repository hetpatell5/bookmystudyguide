import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../header/header';
import Footer from '../footer/footer';
import { Helmet } from 'react-helmet-async';
import { useSiteConfig } from '../../../context/SiteConfigContext';
import './UserLayout.scss';

export default function UserLayout() {
    const { config } = useSiteConfig();

    return (
        <div className="user-layout">
            <Helmet>
                <title>{config.SITE_TITLE}</title>
                <meta name="description" content={config.SITE_DESCRIPTION} />
                <meta name="keywords" content={config.SITE_KEYWORDS} />
                <meta property="og:title" content={config.SITE_TITLE} />
                <meta property="og:description" content={config.SITE_DESCRIPTION} />
            </Helmet>
            <Header />
            <main className="main-content">
                <Outlet />
            </main>
            <Footer />
            {/* <GeminiChat /> */}
        </div>
    );
}
