``` http
POST /bookings
Authorization: Bearer <your_access_token>
Content-Type: application/json
```

Example request body:

``` json
{
  "studioId": "64f000000000000000000001",
  "date": "2026-12-15",
  "startTime": "10:00",
  "hours": 2
}
```

The server:

-   Validates the studio ID, date input presence, start-time format, and
    duration.
-   Limits the duration to a maximum of 8 hours.
-   Calculates the end time and rejects bookings that reach or pass
    midnight.
-   Loads the studio from MongoDB.
-   Checks for overlapping **confirmed** bookings for that studio and
    date.
-   Calculates the hourly charge, deposit, and total from the database
    record.
-   Creates the booking with `Pending` status.

The client does not submit the price, deposit, total, user email, or
booking status as trusted values.

#### Cancel a booking

``` http
PATCH /bookings/:id/cancel
Authorization: Bearer <your_access_token>
```

No request body is required. The current route only cancels a booking
when its ID belongs to the authenticated user's email and its status is
`Pending`.

------------------------------------------------------------------------

## 🗃️ Data Models

The following are simplified examples of the documents stored in
MongoDB.

### Studio

``` json
{
  "_id": "ObjectId",
  "title": "Creative Photography Studio",
  "category": "photo-studios",
  "capacity": 8,
  "hourlyRate": 1200,
  "deposit": 2000,
  "location": "Dhaka, Bangladesh",
  "imageUrl": "https://example.com/studio.jpg",
  "amenities": ["Lighting", "Wi-Fi"],
  "description": "A comfortable creative workspace.",
  "host": {
    "userId": "authenticated-user-id",
    "name": "Studio Host",
    "email": "host@example.com"
  },
  "createdAt": "2026-11-05T10:00:00.000Z"
}
```

### Booking

``` json
{
  "_id": "ObjectId",
  "email": "user@example.com",
  "studioId": "studio-object-id",
  "studioTitle": "Creative Photography Studio",
  "category": "photo-studios",
  "imageUrl": "https://example.com/studio.jpg",
  "location": "Dhaka, Bangladesh",
  "date": "2026-12-15",
  "startTime": "10:00",
  "endTime": "12:00",
  "hours": 2,
  "hourlyRate": 1200,
  "deposit": 2000,
  "total": 4400,
  "status": "Pending",
  "createdAt": "2026-11-05T10:00:00.000Z"
}
```

### Booking statuses

The current booking creation route sets the initial status to:

-   `Pending` --- Waiting for host approval.
-   `Confirmed` --- Approved booking; included in the current overlap
    check.
-   `Cancelled` --- Cancelled by the booking owner through the
    cancellation endpoint.

The current API does not include a host approval/status-update endpoint.

------------------------------------------------------------------------

## 🧪 Testing with Postman

You can test the API using Postman or another HTTP client.

Suggested testing order:

1.  Call `GET /` to check the server.
2.  Call `GET /studios` to retrieve studio listings.
3.  Sign in through the frontend authentication flow and obtain a valid
    token.
4.  Add the token as a Bearer Token in Postman.
5.  Create a studio with `POST /studios`.
6.  Create a booking with `POST /bookings`.
7.  Retrieve your bookings with `GET /my-bookings`.
8.  Cancel a pending booking with `PATCH /bookings/:id/cancel`.
9.  Test listing ownership with the edit and delete endpoints.

------------------------------------------------------------------------

## ⚠️ Important Implementation Notes

These are useful improvements to consider before production deployment:

-   **Booking date validation:** The current booking route checks that a
    date is present but does not yet validate its format or reject past
    dates on the server.
-   **Pending booking conflicts:** The current overlap query checks only
    `Confirmed` bookings. Multiple overlapping pending requests can
    therefore be created. Decide whether pending requests should
    temporarily reserve a slot and update the query accordingly.
-   **Atomic availability protection:** A read-then-insert conflict
    check can allow simultaneous requests to race. Use an appropriate
    reservation/locking strategy or database transaction where
    supported.
-   **Studio deletion:** Deleting a studio currently does not remove or
    otherwise handle its existing bookings. Define a policy for bookings
    linked to deleted studios.
-   **ObjectId validation:** Validate IDs before constructing `ObjectId`
    values in every route, including the public `GET /studios/:id`
    route.
-   **Consistent API responses:** Some routes return arrays or documents
    directly while others return `{ message, data }`. A consistent
    response format will make frontend error handling easier.
-   **Error handling:** Add centralized Express error handling and
    consider request validation middleware.
-   **CORS:** Add your production frontend origin to the allowed-origin
    list when deploying.
-   **Production configuration:** Read the port from `process.env.PORT`,
    configure secure environment variables, and avoid exposing database
    credentials or private keys.

------------------------------------------------------------------------

## 🌱 Future Improvements

-   Host dashboard for approving or rejecting booking requests
-   Real-time studio availability calendar
-   Search, filtering, and pagination
-   Studio reviews and ratings
-   Booking notifications
-   Payment gateway integration
-   Automated API tests
-   Rate limiting and request logging

## 🤝 Contributing

Contributions and suggestions are welcome.

1.  Fork the repository.
2.  Create a feature branch: `git checkout -b feature/your-feature`
3.  Commit your changes: `git commit -m "Add your feature"`
4.  Push your branch: `git push origin feature/your-feature`
5.  Open a pull request.

## 📄 License

Add your preferred license before publishing this project publicly.

------------------------------------------------------------------------

::: {align="center"}
**StudioSpace API --- powering better creative spaces.**
:::
