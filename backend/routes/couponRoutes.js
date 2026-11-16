const express = require('express');
const router = require('express').Router();
const { Coupon, Product, ComboProduct, Synopsis } = require('../model/mysql');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { couponLimiter } = require('../middleware/rateLimiter');

const normalizeIdList = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean).map(String);
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
        } catch {
            return value.split(',').map(v => v.trim()).filter(Boolean);
        }
    }
    return [];
};

const normalizeDiscountType = (type) => {
    const value = String(type || 'percentage').toLowerCase();
    if (value === 'fixed') return 'flat';
    return value === 'flat' ? 'flat' : 'percentage';
};

const couponRuleLabels = (coupon) => {
    const labels = ['Only one coupon can be used per order'];
    const minItems = Number(coupon.minItems || 0);
    const minOrderAmount = Number(coupon.minOrderAmount || 0);

    if (minOrderAmount > 0) labels.push(`Minimum order value ₹${minOrderAmount}`);
    if (minItems > 0) labels.push(`Buy at least ${minItems} item${minItems === 1 ? '' : 's'}`);
    if (normalizeIdList(coupon.eligibleProductIds).length) labels.push('Valid on selected books only');
    if (normalizeIdList(coupon.eligibleComboIds).length) labels.push('Valid on selected combos only');
    if (normalizeIdList(coupon.eligibleMainDegreeIds).length) labels.push('Valid on selected degrees only');
    if (normalizeIdList(coupon.eligibleSynopsisIds).length) labels.push('Valid on selected synopsis/project items only');

    return labels;
};

const inferCartItem = async (item) => {
    const productId = String(item.productId || item.id || item._id || '');
    const quantity = Number(item.quantity || 1);
    const price = Number(item.price || 0);
    const base = {
        productId,
        quantity,
        price,
        subtotal: price * quantity,
        itemKind: String(item.itemKind || item.kind || '').toLowerCase(),
        mainDegreeId: item.mainDegreeId ? String(item.mainDegreeId) : null,
    };

    if (!productId) return base;

    if (!base.itemKind || !base.mainDegreeId) {
        const product = await Product.findByPk(productId, { attributes: ['id', 'mainDegreeId'] });
        if (product) {
            base.itemKind = base.itemKind || 'book';
            base.mainDegreeId = base.mainDegreeId || (product.mainDegreeId ? String(product.mainDegreeId) : null);
            return base;
        }
    }

    if (!base.itemKind || !base.mainDegreeId) {
        const combo = await ComboProduct.findByPk(productId, { attributes: ['id', 'mainDegreeId'] });
        if (combo) {
            base.itemKind = base.itemKind || 'combo';
            base.mainDegreeId = base.mainDegreeId || (combo.mainDegreeId ? String(combo.mainDegreeId) : null);
            return base;
        }
    }

    if (!base.itemKind || !base.mainDegreeId) {
        const synopsis = await Synopsis.findByPk(productId, { attributes: ['id', 'mainDegreeId'] });
        if (synopsis) {
            base.itemKind = base.itemKind || 'synopsis';
            base.mainDegreeId = base.mainDegreeId || (synopsis.mainDegreeId ? String(synopsis.mainDegreeId) : null);
        }
    }

    return base;
};

const getEligibility = async (coupon, cartItems = [], orderValue = 0) => {
    const productIds = normalizeIdList(coupon.eligibleProductIds);
    const comboIds = normalizeIdList(coupon.eligibleComboIds);
    const degreeIds = normalizeIdList(coupon.eligibleMainDegreeIds);
    const synopsisIds = normalizeIdList(coupon.eligibleSynopsisIds);
    const hasTargetRules = productIds.length || comboIds.length || degreeIds.length || synopsisIds.length;
    const enrichedItems = await Promise.all((Array.isArray(cartItems) ? cartItems : []).map(inferCartItem));

    if (!hasTargetRules) {
        return {
            eligibleSubtotal: Number(orderValue || 0),
            eligibleQuantity: enrichedItems.reduce((sum, item) => sum + item.quantity, 0),
            hasTargetRules,
        };
    }

    const eligibleItems = enrichedItems.filter((item) => {
        const id = String(item.productId || '');
        if (productIds.includes(id)) return true;
        if (comboIds.includes(id)) return true;
        if (synopsisIds.includes(id)) return true;
        if (item.mainDegreeId && degreeIds.includes(String(item.mainDegreeId))) return true;
        return false;
    });

    return {
        eligibleSubtotal: eligibleItems.reduce((sum, item) => sum + item.subtotal, 0),
        eligibleQuantity: eligibleItems.reduce((sum, item) => sum + item.quantity, 0),
        hasTargetRules,
    };
};

const toPublicCoupon = (coupon, orderValue = 0, eligibility = null) => {
    const plain = coupon.toJSON ? coupon.toJSON() : coupon;
    const discountValue = Number(plain.discountValue || 0);
    const minOrderAmount = Number(plain.minOrderAmount || 0);
    const minItems = Number(plain.minItems || 0);
    const maxDiscountAmount = plain.maxDiscountAmount == null ? null : Number(plain.maxDiscountAmount);
    const discountBase = eligibility ? Number(eligibility.eligibleSubtotal || 0) : Number(orderValue || 0);
    let discountAmount = plain.discountType === 'percentage'
        ? Math.round((discountBase * discountValue) / 100)
        : discountValue;

    if (maxDiscountAmount != null && discountAmount > maxDiscountAmount) {
        discountAmount = maxDiscountAmount;
    }
    if (discountAmount > discountBase) {
        discountAmount = discountBase;
    }

    return {
        ...plain,
        discountValue,
        minOrderAmount,
        minItems,
        maxDiscountAmount,
        discountAmount,
        eligibleSubtotal: discountBase,
        conditions: couponRuleLabels(plain),
        // Backward-compatible aliases used by the current checkout UI.
        type: plain.discountType === 'percentage' ? 'PERCENTAGE' : 'FLAT',
        discount: discountValue,
    };
};

// 1. Create Coupon (Admin Only)
router.post('/', adminAuth, async (req, res) => {
    try {
        const {
            code, discount, discountValue, type, discountType, minOrderValue, minOrderAmount,
            minItems, expiryDate, isActive, usageLimit, maxDiscountAmount,
            eligibleProductIds, eligibleComboIds, eligibleMainDegreeIds, eligibleSynopsisIds
        } = req.body;

        if (!code || (!discount && !discountValue)) {
            return res.status(400).json({ success: false, message: 'Coupon code and discount are required' });
        }

        const existing = await Coupon.findOne({ where: { code: code.toUpperCase() } });
        if (existing) return res.status(400).json({ success: false, message: 'Coupon code already exists' });

        const newCoupon = await Coupon.create({
            code: code.toUpperCase(),
            discountValue: Number(discountValue ?? discount),
            discountType: normalizeDiscountType(discountType ?? type),
            minOrderAmount: Number(minOrderAmount ?? minOrderValue ?? 0),
            minItems: Number(minItems || 0),
            eligibleProductIds: normalizeIdList(eligibleProductIds),
            eligibleComboIds: normalizeIdList(eligibleComboIds),
            eligibleMainDegreeIds: normalizeIdList(eligibleMainDegreeIds),
            eligibleSynopsisIds: normalizeIdList(eligibleSynopsisIds),
            maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
            expiryDate: expiryDate || null,
            usageLimit: usageLimit ? Number(usageLimit) : null,
            isActive: isActive !== false
        });

        res.status(201).json({ success: true, data: toPublicCoupon(newCoupon), message: "Coupon Created" });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. Get All Coupons (Admin Only)
router.get('/', adminAuth, async (req, res) => {
    try {
        const coupons = await Coupon.findAll({ order: [['createdAt', 'DESC']] });
        res.status(200).json({ success: true, data: coupons.map(c => toPublicCoupon(c)) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. Delete Coupon (Admin Only)
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const deleted = await Coupon.destroy({ where: { id: req.params.id } });
        if (!deleted) return res.status(404).json({ success: false, message: "Coupon not found" });
        res.status(200).json({ success: true, message: "Coupon Deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3b. List Active Coupons (User - Public, rate limited)
router.get('/active', couponLimiter, async (req, res) => {
    try {
        const coupons = await Coupon.findAll({
            where: { isActive: true },
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json({ success: true, data: coupons.map(c => toPublicCoupon(c)) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 4. Verify Coupon (User - Public, rate limited)
router.post('/verify', couponLimiter, async (req, res) => {
    try {
        const { code, orderValue, cartItems } = req.body;
        const numericOrderValue = Number(orderValue || 0);

        if (!code) {
            return res.status(400).json({ success: false, message: 'Coupon code is required' });
        }

        const coupon = await Coupon.findOne({ where: { code: code.toUpperCase(), isActive: true } });

        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Invalid Coupon Code' });
        }

        // Check Expiry
        if (coupon.expiryDate && new Date() > new Date(coupon.expiryDate)) {
            return res.status(400).json({ success: false, message: 'Coupon Expired' });
        }

        // Check Min Order Value
        if (numericOrderValue < Number(coupon.minOrderAmount || 0)) {
            return res.status(400).json({
                success: false,
                message: `Minimum order value of ₹${coupon.minOrderAmount} required`
            });
        }

        if (coupon.usageLimit && Number(coupon.usedCount || 0) >= Number(coupon.usageLimit)) {
            return res.status(400).json({ success: false, message: 'Coupon usage limit reached' });
        }

        const eligibility = await getEligibility(coupon, cartItems, numericOrderValue);

        if (eligibility.hasTargetRules && eligibility.eligibleSubtotal <= 0) {
            return res.status(400).json({
                success: false,
                message: 'This coupon is not valid for the items in your cart',
                conditions: couponRuleLabels(coupon)
            });
        }

        if (Number(coupon.minItems || 0) > 0 && eligibility.eligibleQuantity < Number(coupon.minItems || 0)) {
            return res.status(400).json({
                success: false,
                message: `Add at least ${coupon.minItems} eligible item${Number(coupon.minItems) === 1 ? '' : 's'} to use this coupon`,
                conditions: couponRuleLabels(coupon)
            });
        }

        res.status(200).json({
            success: true,
            data: toPublicCoupon(coupon, numericOrderValue, eligibility),
            message: 'Coupon Applied Successfully'
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
