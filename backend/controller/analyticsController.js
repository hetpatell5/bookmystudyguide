const { Order, OrderItem, User, Product, Config, sequelize } = require("../model/mysql");
const { Op, fn, col, literal } = require("sequelize");

/**
 * Get Deep Analytics for Admin Dashboard
 */
exports.getDeepAnalytics = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();

        // 1. Parallel Aggregations for High Performance
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayEnd = new Date(today);
        const last7Days = new Date(today);
        last7Days.setDate(last7Days.getDate() - 7);
        const last30Days = new Date(today);
        last30Days.setDate(last30Days.getDate() - 30);

        // Custom Date Range from Query
        const queryStart = req.query.startDate ? new Date(req.query.startDate) : null;
        const queryEnd = req.query.endDate ? new Date(req.query.endDate) : null;
        if (queryStart) queryStart.setHours(0, 0, 0, 0);
        if (queryEnd) queryEnd.setHours(23, 59, 59, 999);

        // Helper for period stats
        const getPeriodStats = async (start, end = null) => {
            const where = { paymentStatus: "Paid" };
            if (end) {
                where.createdAt = { [Op.between]: [start, end] };
            } else {
                where.createdAt = { [Op.gte]: start };
            }
            const data = await Order.findOne({
                where,
                attributes: [
                    [fn('SUM', col('amount')), 'revenue'],
                    [fn('COUNT', col('id')), 'count']
                ],
                raw: true
            });
            return {
                revenue: parseFloat(data?.revenue || 0),
                count: parseInt(data?.count || 0)
            };
        };

        const [
            overallStats,
            stateData,
            productData,
            trendData,
            activeUsersCount,
            todayStats,
            yesterdayStats,
            last7DaysStats,
            last30DaysStats,
            customStats,
            gaConfig
        ] = await Promise.all([
            // 1. Overall Stats
            Order.findOne({
                where: { paymentStatus: "Paid" },
                attributes: [
                    [fn('COUNT', col('id')), 'totalOrders'],
                    [fn('SUM', col('amount')), 'totalRevenue']
                ],
                raw: true
            }),
 
            // 2. Geographic Analysis (Top 10 States)
            Order.findAll({
                where: { paymentStatus: "Paid" },
                attributes: [
                    [fn('IFNULL', col('state'), 'Unknown'), 'name'],
                    [fn('COUNT', col('id')), 'count']
                ],
                group: ['state'],
                order: [[literal('count'), 'DESC']],
                limit: 10,
                raw: true
            }),
 
            // 3. Product Popularity (Top 10) - Using OrderItem
            OrderItem.findAll({
                attributes: [
                    [fn('IFNULL', col('title'), 'Unknown Book'), 'name'],
                    [fn('SUM', col('quantity')), 'count']
                ],
                group: ['title'],
                order: [[literal('count'), 'DESC']],
                limit: 10,
                raw: true
            }),
 
            // 4. Monthly Trend for Current Year
            Order.findAll({
                where: {
                    paymentStatus: "Paid",
                    createdAt: {
                        [Op.between]: [new Date(`${currentYear}-01-01`), new Date(`${currentYear}-12-31`)]
                    }
                },
                attributes: [
                    [fn('MONTH', col('createdAt')), 'month'],
                    [fn('COUNT', col('id')), 'orders'],
                    [fn('SUM', col('amount')), 'revenue']
                ],
                group: [fn('MONTH', col('createdAt'))],
                order: [[literal('month'), 'ASC']],
                raw: true
            }),
 
            // 5. Active Users
            User.count(),
 
            // 6. Period Stats
            getPeriodStats(today),
            getPeriodStats(yesterday, yesterdayEnd),
            getPeriodStats(last7Days),
            getPeriodStats(last30Days),
            queryStart && queryEnd ? getPeriodStats(queryStart, queryEnd) : Promise.resolve({ revenue: 0, count: 0 }),
            Config.findOne({ where: { key: "GOOGLE_ANALYTICS_ID", isActive: true } })
        ]);

        // Format Period Stats
        const revenuePeriods = {
            today: todayStats,
            yesterday: yesterdayStats,
            last7Days: last7DaysStats,
            last30Days: last30DaysStats,
            allTime: {
                revenue: parseFloat(overallStats?.totalRevenue || 0),
                count: parseInt(overallStats?.totalOrders || 0)
            },
            custom: customStats
        };

        // Format Trend Data to include all months
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const formattedTrend = months.map((m, i) => {
            const found = trendData.find(t => parseInt(t.month) === i + 1);
            return {
                name: m,
                orders: found ? parseInt(found.orders) : 0,
                revenue: found ? parseFloat(found.revenue) : 0
            };
        });

        // Seasonality Logic
        const currentMonth = new Date().getMonth() + 1; // 1-12
        const isExamSeason = [4, 5, 10, 11].includes(currentMonth); // April-May, Oct-Nov
        const seasonStatus = isExamSeason ? "Peak" : "Normal";

        let suggestions = [
            {
                type: "Marketing",
                title: "Trending Subjects",
                desc: "Consider running targeted ads for subjects that show high order volume this month.",
                icon: "TrendingUp"
            },
            {
                type: "Sales",
                title: "Regional Optimization",
                desc: "Offer a limited-time coupon for slow states to boost geographic expansion.",
                icon: "Zap"
            },
            {
                type: "Product",
                title: "Book Bundling",
                desc: "Bundle top-selling IGNOU help books to increase Average Order Value.",
                icon: "Package"
            }
        ];

        res.json({
            success: true,
            data: {
                stats: {
                    totalOrders: parseInt(overallStats?.totalOrders || 0),
                    totalRevenue: parseFloat(overallStats?.totalRevenue || 0),
                    activeUsers: activeUsersCount,
                    avgOrderValue: overallStats?.totalOrders ? Math.round(overallStats.totalRevenue / overallStats.totalOrders) : 0,
                    periods: revenuePeriods,
                    gaStatus: gaConfig?.value ? "Active" : "Not Configured"
                },
                geographic: stateData,
                products: productData,
                trend: formattedTrend,
                season: { isExamSeason, status: seasonStatus },
                suggestions: suggestions.slice(0, 3)
            }
        });

    } catch (err) {
        console.error("ANALYTICS ERROR:", err);
        res.status(500).json({ success: false, message: "Aggregation failed: " + err.message });
    }
};
