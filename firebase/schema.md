# Firestore Schema — BizBuddy AI

## Collections

### `users/{userId}/products/{productId}`

| Field       | Type      | Description                      |
|-------------|-----------|----------------------------------|
| name        | string    | Product name                     |
| category    | string    | Product category (Grains, etc.)  |
| quantity    | number    | Current stock quantity           |
| price       | number    | Price per unit (₹)               |
| threshold   | number    | Low stock alert threshold        |
| createdAt   | timestamp | When the product was added       |
| updatedAt   | timestamp | Last modification time           |

### `users/{userId}/sales/{saleId}`

| Field       | Type      | Description                      |
|-------------|-----------|----------------------------------|
| productId   | string    | Reference to product document    |
| productName | string    | Denormalized product name        |
| quantity    | number    | Quantity sold                    |
| totalPrice  | number    | Sale total (₹)                   |
| date        | timestamp | Date of sale                     |

### `users/{userId}/expenses/{expenseId}`

| Field       | Type      | Description                      |
|-------------|-----------|----------------------------------|
| description | string    | Expense description              |
| amount      | number    | Expense amount (₹)               |
| category    | string    | Expense category (optional)      |
| date        | timestamp | Date of expense                  |

## Security Rules (recommended)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Indexes

- `users/{userId}/products` — composite index on `category` + `name` for filtered queries
- `users/{userId}/sales` — composite index on `date` (desc) for recent sales queries
