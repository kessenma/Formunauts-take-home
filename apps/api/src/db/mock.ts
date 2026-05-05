import { db } from './client';
import { donations, donors, donationLocations } from './schema';
import { eq, inArray, sql } from 'drizzle-orm';
import type { MockDataParams } from '@formunauts/shared';

const FIRST_NAMES = ['Alex', 'Casey', 'Dana', 'Ellis', 'Finley', 'Harper', 'Indigo', 'Jordan', 'Kendall', 'Lane'];
const LAST_NAMES = ['Avery', 'Blake', 'Chase', 'Drew', 'Emerson', 'Flynn', 'Gray', 'Hunter', 'Ingram', 'James'];

const CHANNEL_PAYMENT_MAP: Record<string, string[]> = {
  street: ['cash', 'sepa_direct_debit'],
  door_to_door: ['sepa_direct_debit', 'bank_transfer'],
  event: ['credit_card', 'google_pay', 'apple_pay'],
  phone: ['credit_card', 'paypal'],
  email: ['credit_card', 'paypal'],
  social_media: ['credit_card', 'paypal'],
};

const CHANNELS = Object.keys(CHANNEL_PAYMENT_MAP) as (keyof typeof CHANNEL_PAYMENT_MAP)[];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randDate(start: string, end: string) {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  return new Date(startMs + Math.random() * (endMs - startMs));
}

export async function generateMockDonations(params: MockDataParams, campaignId: number): Promise<number> {
  // Get existing seed locations to link mock donations to
  const existingLocations = await db.select({ id: donationLocations.id }).from(donationLocations).limit(8);
  const locationIds = existingLocations.map(l => l.id);

  // Batch-create one donor per mock donation
  const donorRows = Array.from({ length: params.count }, (_, i) => {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    return {
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@mock.test`,
    };
  });

  const insertedDonors = await db.insert(donors).values(donorRows).returning({ id: donors.id });
  const donorIds = insertedDonors.map(d => d.id);

  const donationRows = donorIds.map((donorId) => {
    const channel = pick(CHANNELS);
    const paymentMethod = pick(CHANNEL_PAYMENT_MAP[channel]);
    return {
      campaignId,
      donorId,
      locationId: locationIds.length > 0 ? pick(locationIds) : null,
      amount: (Math.random() * (params.maxAmount - params.minAmount) + params.minAmount).toFixed(2),
      currency: 'EUR',
      paymentMethod: paymentMethod as 'sepa_direct_debit' | 'credit_card' | 'google_pay' | 'apple_pay' | 'paypal' | 'bank_transfer' | 'cash',
      channel: channel as 'street' | 'door_to_door' | 'event' | 'phone' | 'email' | 'social_media',
      date: randDate(params.startDate, params.endDate),
      isMock: true,
    };
  });

  await db.insert(donations).values(donationRows);
  return donationRows.length;
}

export async function deleteAllMockDonations(): Promise<number> {
  // Find donors whose ALL donations are mock (safe to delete when mocks are cleaned)
  const orphanResult = await db
    .select({ donorId: donations.donorId })
    .from(donations)
    .groupBy(donations.donorId)
    .having(sql`bool_and(${donations.isMock} = true)`);

  const orphanDonorIds = orphanResult.map(r => r.donorId);

  const deleted = await db
    .delete(donations)
    .where(eq(donations.isMock, true))
    .returning({ id: donations.id });

  if (orphanDonorIds.length > 0) {
    await db.delete(donors).where(inArray(donors.id, orphanDonorIds));
  }

  return deleted.length;
}
