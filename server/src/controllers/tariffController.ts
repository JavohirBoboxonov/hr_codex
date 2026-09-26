import Tariff from '../models/Tariff';

// Barcha tariflar (faol va nofaol)
export const getAllTariffs = async (req, res) => {
  try {
    const { activeOnly } = req.query;
    const filter: { isActive?: boolean } = {};
    if (activeOnly === 'true') {
      filter.isActive = true;
    }

    const tariffs = await Tariff.find(filter)
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 });

    const tariffsData = tariffs.map(t => ({
      id: t._id.toString(),
      name: t.name,
      description: t.description,
      price: t.price,
      interviews: t.interviews,
      isActive: t.isActive,
      createdBy: t.createdBy && typeof t.createdBy === 'object' && 'fullName' in t.createdBy ? {
        id: (t.createdBy as unknown as import('../models/User').IUserDocument)._id.toString(),
        name: (t.createdBy as unknown as import('../models/User').IUserDocument).fullName,
      } : null,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    res.status(200).json({
      success: true,
      data: tariffsData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Faol tariflar (nomzodlar uchun)
export const getActiveTariffs = async (req, res) => {
  try {
    const tariffs = await Tariff.find({ isActive: true })
      .sort({ price: 1 });

    const tariffsData = tariffs.map(t => ({
      id: t._id.toString(),
      name: t.name,
      description: t.description,
      price: t.price,
      interviews: t.interviews,
    }));

    res.status(200).json({
      success: true,
      data: tariffsData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Yangi tarif yaratish (admin)
export const createTariff = async (req, res) => {
  try {
    const { name, description, price, interviews } = req.body;

    if (!name || !price || !interviews) {
      return res.status(400).json({
        success: false,
        message: 'Nomi, narx va suhbatlar soni kiritilishi shart',
      });
    }

    if (parseFloat(price) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Narx 0 dan katta bo\'lishi kerak',
      });
    }

    if (parseInt(interviews) < 1) {
      return res.status(400).json({
        success: false,
        message: 'Suhbatlar soni kamida 1 bo\'lishi kerak',
      });
    }

    const tariff = await Tariff.create({
      name,
      description: description || '',
      price: parseFloat(price),
      interviews: parseInt(interviews),
      createdBy: req.user._id,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'Tarif muvaffaqiyatli yaratildi',
      data: {
        id: tariff._id.toString(),
        name: tariff.name,
        description: tariff.description,
        price: tariff.price,
        interviews: tariff.interviews,
        isActive: tariff.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Tarifni yangilash (admin)
export const updateTariff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, interviews, isActive } = req.body;

    const tariff = await Tariff.findById(id);
    if (!tariff) {
      return res.status(404).json({
        success: false,
        message: 'Tarif topilmadi',
      });
    }

    if (name !== undefined) tariff.name = name;
    if (description !== undefined) tariff.description = description;
    if (price !== undefined) {
      if (parseFloat(price) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Narx 0 dan katta bo\'lishi kerak',
        });
      }
      tariff.price = parseFloat(price);
    }
    if (interviews !== undefined) {
      if (parseInt(interviews) < 1) {
        return res.status(400).json({
          success: false,
          message: 'Suhbatlar soni kamida 1 bo\'lishi kerak',
        });
      }
      tariff.interviews = parseInt(interviews);
    }
    if (isActive !== undefined) tariff.isActive = isActive;

    await tariff.save();

    res.status(200).json({
      success: true,
      message: 'Tarif muvaffaqiyatli yangilandi',
      data: {
        id: tariff._id.toString(),
        name: tariff.name,
        description: tariff.description,
        price: tariff.price,
        interviews: tariff.interviews,
        isActive: tariff.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Tarifni o'chirish (admin)
export const deleteTariff = async (req, res) => {
  try {
    const { id } = req.params;

    const tariff = await Tariff.findById(id);
    if (!tariff) {
      return res.status(404).json({
        success: false,
        message: 'Tarif topilmadi',
      });
    }

    await Tariff.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Tarif muvaffaqiyatli o\'chirildi',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
