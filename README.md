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
`image` URL to the room's `images` array. With Cloudinary configured, uploads
are stored persistently and return a secure Cloudinary URL. Local development
without Cloudinary uses `server/uploads`.

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

## Deploying to Vercel

### Prepare MongoDB Atlas

Create a MongoDB Atlas cluster and database for Moonstoria. In Atlas, open
**Network Access** and allow `0.0.0.0/0` so Vercel serverless functions can
connect from their changing outbound addresses. Use a strong database user
password and the Atlas connection string as `MONGO_URI`.

### Create the two Vercel projects

Import this Git repository twice in Vercel:

1. Create the API project with **Root Directory** set to `server`.
2. Create the frontend project with **Root Directory** set to `client`.

The server project uses `server/vercel.json` and the `@vercel/node` runtime.
The client project runs `npm run build` and serves the Vite `dist` output;
`client/vercel.json` rewrites deep links to the SPA entry point.

### Configure environment variables

In each Vercel project, open **Project Settings → Environment Variables** and
add the following values for Production (and Preview if those deployments need
them).

**Server project**

- `MONGO_URI`: the Atlas connection string, including its database path.
- `MONGO_DB_NAME`: optional database name if it is not included in the URI.
- `JWT_SECRET`: a long, randomly generated signing secret.
- `JWT_EXPIRES_IN`: optional token lifetime; defaults to `7d`.
- `CLIENT_URL`: the deployed client origin, with no trailing slash. Multiple
  allowed origins can be comma-separated.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`:
  Cloudinary credentials used for persistent room and profile image uploads.
- `CRON_SECRET`: a long, randomly generated secret used to authorize Vercel's
  daily reservation-status synchronization cron.
- `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`: administrator seed values.
  These are needed when running `npm run seed`; the seed script prints the
  administrator email but never the password.

**Client project**

- `VITE_API_URL`: the server's deployment URL, without a trailing `/api` (for
  example, `https://moonstoria-api.vercel.app`).

Never put secret values in the client project. Vite variables are bundled into
public frontend assets.

### Deploy in order

1. Deploy the server project first and copy its deployment URL.
2. Set that URL as `VITE_API_URL` in the client project's environment
   variables, then deploy the client project.
3. Copy the deployed client URL and set it as `CLIENT_URL` in the server
   project's environment variables, then redeploy the server.
4. When upgrading an existing database, run `npm run migrate:roles`,
   `npm run migrate:rooms`, and `npm run migrate:reservations` from a trusted
   local environment configured with the Atlas connection string.

The serverless API caches its Mongoose connection per warm function instance.
Reservation status synchronization runs lazily when reservation data is read;
Vercel also calls the protected daily endpoint configured in the server
project's `vercel.json`.

### Verify the deployment

1. Open `GET <server-url>/api/health`; it should return a healthy status.
2. Sign in through the deployed client.
3. Create a reservation and confirm it appears in the account and admin
   reservation pages.
4. As an admin, upload a room image and confirm its returned Cloudinary URL
   renders after saving the room.
5. Refresh a deep link such as `/admin/reservations`; it should load the app
   rather than return a 404.

For local checks, start the API with `VERCEL` unset. Local uploads without
Cloudinary use the ignored `server/uploads` directory; Vercel requires all
three Cloudinary variables and never writes uploaded files to that directory.
