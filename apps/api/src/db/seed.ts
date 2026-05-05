import { db } from './client';
import {
  organizations, appUsers, campaigns, fundraisers, campaignFundraisers,
  donors, donationLocations, donations,
} from './schema';

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

const FIRST_NAMES = [
  'Alice', 'Bob', 'Carol', 'David', 'Eva', 'Frank', 'Grace', 'Henry', 'Iris', 'Jack',
  'Karen', 'Liam', 'Mia', 'Noah', 'Olivia', 'Paul', 'Quinn', 'Rachel', 'Sam', 'Tina',
  'Ursula', 'Victor', 'Wendy', 'Xavier', 'Yara', 'Zoe', 'Anton', 'Britta', 'Claus', 'Dina',
  'Erik', 'Fatima', 'Georg', 'Hana', 'Ivan', 'Jana', 'Klaus', 'Lena', 'Marco', 'Nina',
  'Omar', 'Petra', 'Ralf', 'Sofia', 'Tobias', 'Ursa', 'Valeria', 'Werner', 'Xenia', 'Yusuf',
];

const LAST_NAMES = [
  'Johnson', 'Smith', 'White', 'Brown', 'Martinez', 'Wilson', 'Lee', 'Taylor', 'Davis', 'Miller',
  'Moore', 'Anderson', 'Thomas', 'Jackson', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Robinson', 'Lewis',
  'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Hoffmann', 'Schäfer',
  'González', 'Rodríguez', 'López', 'Fernández', 'Sánchez', 'Pérez', 'Martínez', 'Gómez', 'Díaz', 'Torres',
  'Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco',
];

// Realistic channel → payment method pairings
const CHANNEL_PAYMENT_MAP: Record<string, string[]> = {
  street: ['cash', 'sepa_direct_debit'],
  door_to_door: ['sepa_direct_debit', 'bank_transfer'],
  event: ['credit_card', 'google_pay', 'apple_pay', 'cash'],
  phone: ['credit_card', 'paypal', 'bank_transfer'],
  email: ['credit_card', 'paypal'],
  social_media: ['credit_card', 'paypal'],
};

const CHANNELS = Object.keys(CHANNEL_PAYMENT_MAP) as (keyof typeof CHANNEL_PAYMENT_MAP)[];

export async function seed() {
  console.log('Seeding database...');

  // ── Delete in FK order ──────────────────────────────────────────────────────
  await db.delete(donations);
  await db.delete(campaignFundraisers);
  await db.delete(fundraisers);
  await db.delete(donors);
  await db.delete(donationLocations);
  await db.delete(campaigns);
  await db.delete(appUsers);
  await db.delete(organizations);

  // ── Organizations ───────────────────────────────────────────────────────────
  const [npo, agency] = await db.insert(organizations).values([
    { name: 'Community Health Foundation', type: 'npo', country: 'DE', website: 'https://communityhealthfoundation.org' },
    { name: 'FundRaise Pro Agency', type: 'fundraising_agency', country: 'AT', website: 'https://fundraisepro.at' },
  ]).returning();

  // ── App users ───────────────────────────────────────────────────────────────
  await db.insert(appUsers).values([
    { organizationId: npo.id, firstName: 'Sophie', lastName: 'Admin', email: 'admin@communityhealthfoundation.org', role: 'admin' },
    { organizationId: npo.id, firstName: 'Max', lastName: 'Manager', email: 'manager@communityhealthfoundation.org', role: 'manager' },
    { organizationId: npo.id, firstName: 'Jana', lastName: 'Viewer', email: 'viewer@communityhealthfoundation.org', role: 'viewer' },
  ]);

  // ── Campaigns ───────────────────────────────────────────────────────────────
  const [c1, c2, c3, c4] = await db.insert(campaigns).values([
    {
      organizationId: npo.id,
      title: 'Community Health Initiative 2025',
      description: 'Door-to-door and street campaign raising funds for preventive healthcare in urban areas.',
      goal: '80000.00',
      currency: 'EUR',
      status: 'active',
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-12-31'),
    },
    {
      organizationId: npo.id,
      title: 'Clean Water for All',
      description: 'Event-based campaign at music festivals and street fairs to fund clean water infrastructure.',
      goal: '50000.00',
      currency: 'EUR',
      status: 'active',
      startDate: new Date('2025-03-01'),
      endDate: new Date('2025-09-30'),
    },
    {
      organizationId: npo.id,
      title: 'Emergency Relief Fund',
      description: 'Phone and social media campaign for rapid disaster relief response.',
      goal: '100000.00',
      currency: 'EUR',
      status: 'paused',
      startDate: new Date('2024-10-01'),
      endDate: new Date('2025-03-31'),
    },
    {
      organizationId: npo.id,
      title: 'Youth Education Drive 2024',
      description: 'Completed email and social media campaign for youth education scholarships.',
      goal: '30000.00',
      currency: 'EUR',
      status: 'completed',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
    },
  ]).returning();

  const allCampaigns = [c1, c2, c3, c4];

  // ── Fundraisers ─────────────────────────────────────────────────────────────
  const fundraiserData = [
    { firstName: 'Felix', lastName: 'Bauer', email: 'felix.bauer@fundraisepro.at', phone: '+43 664 1234567' },
    { firstName: 'Amelie', lastName: 'Dupont', email: 'amelie.dupont@fundraisepro.at', phone: null },
    { firstName: 'Jonas', lastName: 'Weber', email: 'jonas.weber@fundraisepro.at', phone: '+43 664 2345678' },
    { firstName: 'Chiara', lastName: 'Rossi', email: null, phone: '+43 664 3456789' },
    { firstName: 'Lukas', lastName: 'Hoffmann', email: 'lukas.hoffmann@fundraisepro.at', phone: null },
    { firstName: 'Sofia', lastName: 'García', email: 'sofia.garcia@fundraisepro.at', phone: '+43 664 4567890' },
    { firstName: 'Tobias', lastName: 'Klein', email: null, phone: '+43 664 5678901' },
    { firstName: 'Hana', lastName: 'Novak', email: 'hana.novak@fundraisepro.at', phone: null },
    { firstName: 'Marc', lastName: 'Leclerc', email: 'marc.leclerc@fundraisepro.at', phone: '+43 664 6789012' },
    { firstName: 'Petra', lastName: 'Kovic', email: null, phone: '+43 664 7890123' },
  ];

  const insertedFundraisers = await db.insert(fundraisers)
    .values(fundraiserData.map(f => ({ ...f, organizationId: agency.id })))
    .returning();

  // ── Campaign ↔ Fundraiser assignments ──────────────────────────────────────
  const cfPairs: { campaignId: number; fundraiserId: number }[] = [];
  const shuffled = [...insertedFundraisers].sort(() => Math.random() - 0.5);

  allCampaigns.forEach((campaign, i) => {
    const slice = shuffled.slice(i * 2, i * 2 + 5);
    for (const fr of slice) {
      cfPairs.push({ campaignId: campaign.id, fundraiserId: fr.id });
    }
  });
  await db.insert(campaignFundraisers).values(cfPairs);

  // ── Donation locations ──────────────────────────────────────────────────────
  const insertedLocations = await db.insert(donationLocations).values([
    { city: 'Amsterdam', country: 'NL', latitude: '52.370216', longitude: '4.895168' },
    { city: 'Berlin', country: 'DE', latitude: '52.520008', longitude: '13.404954' },
    { city: 'Paris', country: 'FR', latitude: '48.856613', longitude: '2.352222' },
    { city: 'Vienna', country: 'AT', latitude: '48.208176', longitude: '16.373819' },
    { city: 'Madrid', country: 'ES', latitude: '40.416775', longitude: '-3.703790' },
    { city: 'Rome', country: 'IT', latitude: '41.902782', longitude: '12.496366' },
    { city: 'Warsaw', country: 'PL', latitude: '52.229676', longitude: '21.012229' },
    { city: 'Stockholm', country: 'SE', latitude: '59.329323', longitude: '18.068581' },
  ]).returning();

  // ── Donors ──────────────────────────────────────────────────────────────────
  const donorRows = Array.from({ length: 50 }, (_, i) => {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const hasEmail = Math.random() > 0.2;
    const hasPhone = Math.random() > 0.4;
    const hasAddress = Math.random() > 0.5;
    const loc = pick(insertedLocations);
    return {
      firstName,
      lastName,
      email: hasEmail ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com` : null,
      phone: hasPhone ? `+49 ${randInt(100, 999)} ${randInt(1000000, 9999999)}` : null,
      addressLine1: hasAddress ? `${randInt(1, 200)} ${pick(['Main St', 'Oak Ave', 'Park Lane', 'Church Rd'])}` : null,
      city: hasAddress ? loc.city : null,
      country: hasAddress ? loc.country : null,
      postalCode: hasAddress ? String(randInt(10000, 99999)) : null,
    };
  });

  const insertedDonors = await db.insert(donors).values(donorRows).returning();

  // ── Donations ───────────────────────────────────────────────────────────────
  const fundraiserIds = insertedFundraisers.map(f => f.id);
  const locationIds = insertedLocations.map(l => l.id);
  const donorIds = insertedDonors.map(d => d.id);

  const donationRows = Array.from({ length: 500 }, () => {
    const campaign = pick(allCampaigns);
    const channel = pick(CHANNELS);
    const paymentMethod = pick(CHANNEL_PAYMENT_MAP[channel]);
    const hasFundraiser = ['street', 'door_to_door', 'event'].includes(channel) && Math.random() > 0.1;
    const hasLocation = Math.random() > 0.2;
    const hasFeedback = Math.random() > 0.8;

    return {
      campaignId: campaign.id,
      donorId: pick(donorIds),
      fundraiserId: hasFundraiser ? pick(fundraiserIds) : null,
      locationId: hasLocation ? pick(locationIds) : null,
      amount: rand(5, 500).toFixed(2),
      currency: 'EUR',
      paymentMethod: paymentMethod as 'sepa_direct_debit' | 'credit_card' | 'google_pay' | 'apple_pay' | 'paypal' | 'bank_transfer' | 'cash',
      channel: channel as 'street' | 'door_to_door' | 'event' | 'phone' | 'email' | 'social_media',
      date: randDate(new Date('2024-01-01'), new Date()),
      isRecurring: Math.random() < 0.15,
      donorFeedbackRating: hasFeedback ? randInt(1, 5) : null,
      isMock: false,
    };
  });

  await db.insert(donations).values(donationRows);

  console.log(
    `Seeded: 2 orgs, 3 users, 4 campaigns, 10 fundraisers, ` +
    `8 locations, 50 donors, ${donationRows.length} donations.`,
  );
}

if (import.meta.main) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
