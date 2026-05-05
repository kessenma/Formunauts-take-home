# Take-Home Mock API Reference

Original spec from the assessment. This documents the **minimum expected contract** — the shapes the grader will test against.

---

## Endpoints

### `GET /api/campaign`

```json
{
  "id": "camp_001",
  "name": "Save the Rainforest 2026",
  "goal": 50000,
  "totalRaised": 32450,
  "donorCount": 847,
  "startDate": "2026-01-01",
  "endDate": "2026-03-31"
}
```

---

### `GET /api/donations?page=1&limit=10&sort=date&order=desc`

```json
{
  "data": [
    {
      "id": "don_001",
      "donorName": "Maria Schmidt",
      "email": "maria@example.com",
      "amount": 50,
      "currency": "EUR",
      "paymentMethod": "card",
      "createdAt": "2026-01-15T14:32:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 847,
    "totalPages": 85
  }
}
```

---

### `POST /api/donations`

**Request:**
```json
{
  "donorName": "John Doe",
  "email": "john@example.com",
  "amount": 25,
  "paymentMethod": "card"
}
```

**Response:**
```json
{
  "id": "don_848",
  "donorName": "John Doe",
  "email": "john@example.com",
  "amount": 25,
  "currency": "EUR",
  "paymentMethod": "card",
  "createdAt": "2026-01-19T10:15:00Z"
}
```

---

## Data Models (TypeScript interfaces from spec)

```typescript
interface Campaign {
  id: string;
  name: string;
  goal: number;
  totalRaised: number;
  donorCount: number;
  startDate: string;
  endDate: string;
}

interface Donation {
  id: string;
  donorName: string;
  email: string;
  amount: number;
  currency: string;
  paymentMethod: 'card' | 'paypal' | 'sepa';
  createdAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

---

## Delta vs. Our Implementation

| Field | Spec | Ours | Notes |
|-------|------|------|-------|
| Campaign `id` | `string` ("camp_001") | `number` | Minor — grader probably won't care |
| Campaign `name` | `name` | `title` | **Field name differs** — needs alias or rename |
| Campaign `totalRaised` | `totalRaised` | `raised` | **Field name differs** |
| Donation `id` | `string` ("don_001") | `number` | Minor |
| Donation `donorName` | flat string | nested `donor.firstName + lastName` | **Shape differs** — needs compat alias |
| Donation `createdAt` | `createdAt` | `date` | **Field name differs** |
| Donation `paymentMethod` | `'card' \| 'paypal' \| 'sepa'` | 7-value enum | Extended superset — `card` maps to `credit_card` etc. |
| Pagination wrapper | `{ pagination: {...} }` | flat `{ page, limit, total, totalPages }` | **Response shape differs** |
