const { Advertisement } = require('../model/mysql');
const path = require('path');
const fs = require('fs').promises;
const upload = require('../middleware/uploadMiddleware');
const { deleteFromR2, getFullR2Url } = require("../utils/r2Utils");

// 1. Add Advertisement (desktop image required, mobile image optional)
exports.addAdvertisement = [
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'mobileImage', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      if (!req.files?.image?.[0]) {
        return res.status(400).json({ message: 'No desktop image uploaded' });
      }

      const imageUrl = getFullR2Url(req.files.image[0].key);
      const mobileImageUrl = req.files?.mobileImage?.[0]
        ? getFullR2Url(req.files.mobileImage[0].key)
        : null;

      const newAd = await Advertisement.create({
        title:        req.body.title,
        image:        imageUrl,
        mobileImage:  mobileImageUrl,
        isActive:     req.body.isActive === 'false' ? false : true,
      });

      return res.status(201).json(newAd);
    } catch (error) {
      console.error('Error adding advertisement:', error);
      return res.status(500).json({ message: error.message });
    }
  },
];

// 1.5 Update Advertisement Status
exports.updateAdvertisementStatus = async (req, res) => {
  try {
    const ad = await Advertisement.findByPk(req.params.id);
    if (!ad) return res.status(404).json({ message: 'Ad not found' });
    
    ad.isActive = req.body.isActive;
    await ad.save();
    
    return res.status(200).json(ad);
  } catch (error) {
    console.error('Error updating status:', error);
    return res.status(500).json({ message: error.message });
  }
};

// 2. Get All Advertisements
exports.getAdvertisements = async (req, res) => {
  try {
    const ads = await Advertisement.findAll({ order: [['createdAt', 'DESC']] });
    return res.status(200).json(ads);
  } catch (error) {
    console.error('Error fetching advertisements:', error);
    return res.status(500).json({ message: error.message });
  }
};

// 3. Delete Advertisement
exports.deleteAdvertisement = async (req, res) => {
  try {
    const ad = await Advertisement.findByPk(req.params.id);
    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    // Delete both images from R2
    if (ad.image)       await deleteFromR2(ad.image);
    if (ad.mobileImage) await deleteFromR2(ad.mobileImage);

    await Advertisement.destroy({ where: { id: req.params.id } });
    return res.status(200).json({ message: 'Advertisement deleted' });
  } catch (error) {
    console.error('Error deleting advertisement:', error);
    return res.status(500).json({ message: error.message });
  }
};
