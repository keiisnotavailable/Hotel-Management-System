# Hotel Transylvania

Guest-facing Hotel Transylvania homepage recreated in a flat gothic resort style:

- Cathedral hero with vintage navigation
- Floating dusk-to-dawn booking bar
- Parchment room showcase
- Dracula crypt and suite cards
- Gothic sanctuary story section

## Project structure

```text
client/   React + Vite + Tailwind guest frontend
server/   Express + Mongoose + JWT authentication API
```

## Run locally

Install both app dependencies:

```bash
npm install --prefix client
npm install --prefix server
```

Create `server/.env` from `server/.env.example`. Never commit the MongoDB
connection string or JWT secret.
Set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `server/.env` before
running `npm --prefix server run seed` to create or update the administrator
account. The seed command also resets the sample rooms and reservations.

Use your Atlas connection string as the value of `MONGO_URI`, adding a database
name to the path if your copied URL does not already include one:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-host>/hotel_transylvania?retryWrites=true&w=majority
```

The connection string shared during setup contained a live password. Rotate that
Atlas database password before using this project or sharing the repository.

Start the API:

```bash
npm run server
```

Start the frontend in a second terminal:

```bash
npm run client
```

The API health check is available at `http://localhost:5000/api/health`.

## Admin room API

Admin room endpoints require `Authorization: Bearer <admin-token>`. Rooms can
be listed and managed at `/api/admin/rooms`; paginated lists use `items`, `page`,
`limit`, `total`, and `totalPages`. Use `/api/admin/image-keys` to retrieve
available room-image keys. Upload JPG, PNG, or WebP files up to 5 MB to
`POST /api/admin/uploads` as multipart field `image`, then add its returned
`image` path to the room's `images` array.

## Authentication

The homepage modal now calls:

- `POST /api/auth/register`
- `POST /api/auth/login`

Successful authentication stores the returned JWT and public user profile in
the browser. Passwords are hashed with `bcryptjs` and are never returned by the
API.

After updating an existing database to the roles and account-status fields,
run the migration from the project root:

```bash
npm run migrate:roles
```

Convert existing room `isActive` values to the room `status` field with:

```bash
npm run migrate:rooms
```

Backfill reservation room and guest snapshots on an existing database with:

```bash
npm run migrate:reservations
```
