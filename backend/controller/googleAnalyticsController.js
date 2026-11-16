const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const { Config } = require('../model/mysql');

/**
 * Get Real-time Analytics Data from GA4
 */
/**
 * Get Overview Analytics Data from GA4 (Real-time + Historical + Geo)
 */
exports.getAnalyticsOverview = async (req, res) => {
    try {
        const propertyIdConfig = await Config.findOne({ where: { key: 'GA_PROPERTY_ID' } });
        const serviceAccountConfig = await Config.findOne({ where: { key: 'GA_SERVICE_ACCOUNT' } });

        if (!propertyIdConfig || !serviceAccountConfig || !propertyIdConfig.value || !serviceAccountConfig.value) {
            return res.status(200).json({
                success: false,
                message: "GA4 Data API not configured. Please set Property ID and Service Account JSON in Settings.",
                setupRequired: true
            });
        }

        let credentials;
        try {
            credentials = JSON.parse(serviceAccountConfig.value);
        } catch (e) {
            return res.status(400).json({
                success: false,
                message: "Invalid Service Account JSON format. Please re-paste the JSON key in Settings."
            });
        }

        const analyticsDataClient = new BetaAnalyticsDataClient({ credentials });
        const propertyId = propertyIdConfig.value.trim();

        // 1. Fetch Real-time Active Users
        const [realtimeResponse] = await analyticsDataClient.runRealtimeReport({
            property: `properties/${propertyId}`,
            metrics: [{ name: 'activeUsers' }],
        });

        const activeUsers = realtimeResponse.rows && realtimeResponse.rows[0] && realtimeResponse.rows[0].metricValues 
            ? parseInt(realtimeResponse.rows[0].metricValues[0].value) 
            : 0;

        // 2. Fetch Total Visitors (Last 30 Days)
        const [historicalResponse] = await analyticsDataClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
            metrics: [{ name: 'totalUsers' }],
        });

        const totalVisitors = historicalResponse.rows && historicalResponse.rows[0] && historicalResponse.rows[0].metricValues
            ? parseInt(historicalResponse.rows[0].metricValues[0].value)
            : 0;

        // 3. Fetch Geographic Breakdown (Country -> Region -> City)
        const [geoResponse] = await analyticsDataClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
            dimensions: [
                { name: 'country' },
                { name: 'region' },
                { name: 'city' }
            ],
            metrics: [{ name: 'totalUsers' }],
        });

        // Format Geo Data into Hierarchy: Country -> State (Region) -> City
        const geoHierarchy = {};
        if (geoResponse.rows) {
            geoResponse.rows.forEach(row => {
                const country = row.dimensionValues[0].value;
                const state = row.dimensionValues[1].value;
                const city = row.dimensionValues[2].value;
                const users = parseInt(row.metricValues[0].value);

                if (!geoHierarchy[country]) {
                    geoHierarchy[country] = { name: country, total: 0, states: {} };
                }
                geoHierarchy[country].total += users;

                if (!geoHierarchy[country].states[state]) {
                    geoHierarchy[country].states[state] = { name: state, total: 0, cities: {} };
                }
                geoHierarchy[country].states[state].total += users;

                if (!geoHierarchy[country].states[state].cities[city]) {
                    geoHierarchy[country].states[state].cities[city] = { name: city, total: 0 };
                }
                geoHierarchy[country].states[state].cities[city].total += users;
            });
        }

        // Convert nested objects to arrays for easier frontend mapping
        const formattedGeo = Object.values(geoHierarchy).map(country => ({
            ...country,
            states: Object.values(country.states).map(state => ({
                ...state,
                cities: Object.values(state.cities).sort((a,b) => b.total - a.total)
            })).sort((a,b) => b.total - a.total)
        })).sort((a,b) => b.total - a.total);

        res.json({
            success: true,
            data: {
                realtime: { activeUsers },
                historical: { totalVisitors: totalVisitors },
                geo: formattedGeo,
                lastUpdated: new Date()
            }
        });

    } catch (error) {
        console.error("GA Overview Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch overview data from Google: " + error.message
        });
    }
};

// Original method for dashboard compatibility
exports.getRealtimeData = async (req, res) => {
    try {
        const propertyIdConfig = await Config.findOne({ where: { key: 'GA_PROPERTY_ID' } });
        const serviceAccountConfig = await Config.findOne({ where: { key: 'GA_SERVICE_ACCOUNT' } });

        if (!propertyIdConfig || !serviceAccountConfig || !propertyIdConfig.value || !serviceAccountConfig.value) {
            return res.status(200).json({
                success: false,
                message: "GA4 Data API not configured. Please set Property ID and Service Account JSON in Settings.",
                setupRequired: true
            });
        }

        let credentials;
        try {
            credentials = JSON.parse(serviceAccountConfig.value);
        } catch (e) {
            return res.status(400).json({
                success: false,
                message: "Invalid Service Account JSON format. Please re-paste the JSON key in Settings."
            });
        }

        const analyticsDataClient = new BetaAnalyticsDataClient({ credentials });
        const propertyId = propertyIdConfig.value.trim();

        const [response] = await analyticsDataClient.runRealtimeReport({
            property: `properties/${propertyId}`,
            dimensions: [
                { name: 'country' },
                { name: 'city' }
            ],
            metrics: [
                { name: 'activeUsers' }
            ],
        });

        // Parse metrics and dimensions
        const activeUsersCount = response.rows ? response.rows.reduce((sum, row) => {
            const val = row.metricValues && row.metricValues[0] ? parseInt(row.metricValues[0].value) : 0;
            return sum + val;
        }, 0) : 0;
        
        const locations = response.rows ? response.rows.map(row => ({
            country: row.dimensionValues && row.dimensionValues[0] ? row.dimensionValues[0].value : 'Unknown',
            city: row.dimensionValues && row.dimensionValues[1] ? row.dimensionValues[1].value : '',
            users: row.metricValues && row.metricValues[0] ? parseInt(row.metricValues[0].value) : 0
        })) : [];

        // Sort locations by user count
        locations.sort((a, b) => b.users - a.users);

        res.json({
            success: true,
            data: {
                activeUsers: activeUsersCount,
                locations: locations.slice(0, 10), // Top 10 locations
                lastUpdated: new Date()
            }
        });

    } catch (error) {
        console.error("GA Realtime Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch realtime data from Google: " + error.message
        });
    }
};
