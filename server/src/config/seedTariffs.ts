import Tariff from '../models/Tariff';

const DEFAULT_TARIFFS = [
  {
    name: 'Bir martalik suhbat',
    description: '1 ta intervyu uchun to\'lov (5 000 so\'m)',
    price: 5000,
    interviews: 1,
    isActive: true,
  },
  {
    name: 'Oylik tarif',
    description: 'Oyiga 50 000 so\'m — 10 ta intervyu krediti',
    price: 50000,
    interviews: 10,
    isActive: true,
  },
];

async function seedDefaultTariffs() {
  for (const item of DEFAULT_TARIFFS) {
    const existing = await Tariff.findOne({
      price: item.price,
      interviews: item.interviews,
      isActive: true,
    });

    if (!existing) {
      await Tariff.create(item);
    }
  }
}

export {
  seedDefaultTariffs,
};
