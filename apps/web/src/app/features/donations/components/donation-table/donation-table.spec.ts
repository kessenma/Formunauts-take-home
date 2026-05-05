import { TestBed, ComponentFixture } from '@angular/core/testing';
import { DonationTable } from './donation-table';
import type { Donation, SortParams } from '@formunauts/shared';

const makeDonor = (firstName: string, lastName: string, email: string | null = null) => ({
  id: 1, firstName, lastName, email, phone: null, city: null, country: null,
});

const mockDonations: Donation[] = [
  {
    id: 1,
    campaignId: 1,
    donorName: 'Alice Smith',
    email: 'alice@example.com',
    amount: 100,
    currency: 'EUR',
    paymentMethod: 'credit_card',
    channel: 'street',
    createdAt: '2025-01-15T00:00:00.000Z',
    isRecurring: false,
    isMock: false,
    ipAddress: null,
    donorFeedbackRating: null,
    donor: makeDonor('Alice', 'Smith', 'alice@example.com'),
    fundraiser: null,
    location: null,
  },
  {
    id: 2,
    campaignId: 1,
    donorName: 'Bob Jones',
    email: 'bob@example.com',
    amount: 250,
    currency: 'EUR',
    paymentMethod: 'paypal',
    channel: 'event',
    createdAt: '2025-01-20T00:00:00.000Z',
    isRecurring: false,
    isMock: false,
    ipAddress: null,
    donorFeedbackRating: 5,
    donor: makeDonor('Bob', 'Jones', 'bob@example.com'),
    fundraiser: null,
    location: null,
  },
  {
    id: 3,
    campaignId: 1,
    donorName: 'Carol White',
    email: null,
    amount: 50,
    currency: 'EUR',
    paymentMethod: 'cash',
    channel: 'door_to_door',
    createdAt: '2025-02-01T00:00:00.000Z',
    isRecurring: false,
    isMock: true,
    ipAddress: null,
    donorFeedbackRating: null,
    donor: makeDonor('Carol', 'White'),
    fundraiser: null,
    location: null,
  },
];

const defaultSort: SortParams = { sort: 'date', order: 'desc' };

describe('DonationTable', () => {
  let fixture: ComponentFixture<DonationTable>;
  let component: DonationTable;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DonationTable],
    }).compileComponents();

    fixture = TestBed.createComponent(DonationTable);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('donations', mockDonations);
    fixture.componentRef.setInput('sortParams', defaultSort);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders a row for each donation', () => {
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(mockDonations.length);
  });

  it('displays first donor full name in first row', () => {
    const firstCell = fixture.nativeElement.querySelector('tbody tr td');
    expect(firstCell.textContent.trim()).toBe('Alice Smith');
  });

  it('emits sortChange with asc when Date column clicked (currently desc)', () => {
    let emitted: SortParams | null = null;
    component.sortChange.subscribe((p: SortParams) => (emitted = p));

    // Sort buttons order: Name | Amount | Date
    const sortButtons = fixture.nativeElement.querySelectorAll('thead .sort-btn');
    (sortButtons[2] as HTMLButtonElement).click();
    expect(emitted).toEqual({ sort: 'date', order: 'asc' });
  });

  it('emits sortChange with asc order when a new column (Name) is clicked', () => {
    let emitted: SortParams | null = null;
    component.sortChange.subscribe((p: SortParams) => (emitted = p));

    const nameButton = fixture.nativeElement.querySelector('thead .sort-btn') as HTMLButtonElement;
    nameButton.click();
    expect(emitted).toEqual({ sort: 'donorLastName', order: 'asc' });
  });

  it('marks mock donations with is-mock class', () => {
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows[2].classList.contains('is-mock')).toBe(true);
  });
});
