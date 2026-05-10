# Admin Photos Source

This directory holds the 5 administrator profile photos that are committed to
the repository so they can be automatically copied to the Railway persistent
volume (`/app/admin-photos`) on every deployment.

## How it works

1. **On deployment**, `scripts/start-server.js` calls
   `scripts/setup-admin-photos-volume.js` before starting the Express server.
2. The setup script copies every `.png` file from this directory into
   `/app/admin-photos` (the Railway volume mount point), skipping files that
   are already present with the same size.
3. Once the photos are in the volume, run the Cloudinary migration script:

   ```bash
   node upload_admin_photos_to_cloudinary_production.js
   # or
   npm run upload-admin-photos
   ```

## Expected photos

| Filename | Size |
|---|---|
| `25370b01-c5a9-4cdb-9b82-f668b4fe9208.png` | ~1.8 MB |
| `4c67ded4-b05f-4643-ac1d-7a93bf664742.png` | ~2.1 MB |
| `520223a1-2433-4e21-8359-4d5a683dffd3.png` | ~2.2 MB |
| `admin-francis-nyaki.png` | ~2.1 MB |
| `admin-frank-monorua.png` | ~1.8 MB |

## Adding / replacing photos

1. Copy the `.png` files into this directory.
2. Commit and push — Railway will redeploy and the setup script will copy them
   to the volume automatically.

## Running the setup manually

```bash
# From the backend/ directory
npm run setup-photos
```

This is safe to run multiple times; existing files with matching sizes are
skipped.
