import React from "react";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "./logintrue";
import { CartProvider } from "./CartContext";
import { WishlistProvider } from "./WishlistContext";
import { SiteConfigProvider } from "./SiteConfigContext";
import { UserExperienceProvider } from "./UserExperienceContext";
import { RecentlyViewedProvider } from "./RecentlyViewedContext";
import AnalyticsProvider from "./AnalyticsProvider";

/**
 * AppProviders — wraps the entire app with all required context providers.
 * Keeping all providers in one place makes the context hierarchy easy to
 * understand and modify without touching App.js.
 *
 * Order matters: providers higher in the tree can be consumed by those below.
 */
const AppProviders = ({ children }) => (
  <HelmetProvider>
    <SiteConfigProvider>
      <AnalyticsProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <UserExperienceProvider>
                <RecentlyViewedProvider>
                  {children}
                </RecentlyViewedProvider>
              </UserExperienceProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </AnalyticsProvider>
    </SiteConfigProvider>
  </HelmetProvider>
);

export default AppProviders;
