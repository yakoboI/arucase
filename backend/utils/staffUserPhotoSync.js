/**
 * Keep users.profile_picture and staff_profiles.photo_path in sync
 * when linked via staff_profiles.linked_username.
 */
const { query } = require('../config/database');
const { ensureUserProfilePhotoColumns, removeStoredUserProfilePhoto } = require('./userProfilePhoto');

let linkColumnReady = false;

async function ensureStaffProfileLinkColumn() {
  if (linkColumnReady) return;
  await query(`ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS linked_username VARCHAR(100)`);
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_profiles_linked_username
    ON staff_profiles (linked_username)
    WHERE linked_username IS NOT NULL AND linked_username <> ''
  `);
  linkColumnReady = true;
}

/** Roles that appear under "Watumishi wasio walimu" when auto-suggesting category */
const NON_TEACHING_ROLES = new Set([
  'secretary',
  'accountant',
  'librarian',
  'discipline',
]);

function isTeachingRole(role) {
  if (!role) return true;
  const r = String(role).toLowerCase();
  if (NON_TEACHING_ROLES.has(r)) return false;
  if (r === 'admin' || r === 'superadmin') return true;
  return r === 'teacher' || r === 'priest' || r.includes('rector') || r.includes('master');
}

/**
 * Copy user sidebar photo → linked public staff profile (same Cloudinary URL).
 */
async function syncPhotoFromUserToStaffProfile(username, photoUrl, cloudinaryPublicId) {
  if (!username || !photoUrl) return false;
  await ensureStaffProfileLinkColumn();
  const result = await query(
    `UPDATE staff_profiles
     SET photo_path = $1,
         cloudinary_public_id = $2,
         updated_at = NOW()
     WHERE linked_username = $3`,
    [photoUrl, cloudinaryPublicId || null, username]
  );
  return result.rowCount > 0;
}

/**
 * Copy admin staff-profile photo → linked login user (sidebar).
 */
async function syncPhotoFromStaffProfileToUser(linkedUsername, photoPath, cloudinaryPublicId) {
  if (!linkedUsername || !photoPath) return false;
  await ensureUserProfilePhotoColumns();
  await query(
    `UPDATE users
     SET profile_picture = $1,
         profile_picture_cloudinary_id = $2,
         updated_at = NOW()
     WHERE username = $3`,
    [photoPath, cloudinaryPublicId || null, linkedUsername]
  );
  return true;
}

/** Clear staff profile photo columns for a linked user (optional Cloudinary destroy). */
async function clearStaffProfilePhotoForUser(username, { destroyAsset = false } = {}) {
  if (!username) return;
  await ensureStaffProfileLinkColumn();
  const existing = await query(
    `SELECT photo_path, cloudinary_public_id FROM staff_profiles WHERE linked_username = $1`,
    [username]
  );
  if (existing.rows.length === 0) return;

  if (destroyAsset) {
    await removeStoredUserProfilePhoto(existing.rows[0]);
  }

  await query(
    `UPDATE staff_profiles
     SET photo_path = NULL,
         cloudinary_public_id = NULL,
         updated_at = NOW()
     WHERE linked_username = $1`,
    [username]
  );
}

/** Clear login user photo when staff profile photo removed (optional Cloudinary destroy). */
/** If user already has a sidebar photo, copy it onto a newly linked staff profile. */
async function pullUserPhotoIntoStaffProfile(username, profileId) {
  if (!username || !profileId) return false;
  await ensureUserProfilePhotoColumns();
  await ensureStaffProfileLinkColumn();

  const userRow = await query(
    `SELECT profile_picture, profile_picture_cloudinary_id FROM users WHERE username = $1`,
    [username]
  );
  const picture = userRow.rows[0]?.profile_picture;
  if (!picture || !String(picture).trim()) return false;

  const result = await query(
    `UPDATE staff_profiles
     SET photo_path = $1,
         cloudinary_public_id = $2,
         updated_at = NOW()
     WHERE id = $3
       AND (photo_path IS NULL OR photo_path = '')`,
    [picture, userRow.rows[0].profile_picture_cloudinary_id || null, profileId]
  );
  return result.rowCount > 0;
}

async function clearUserPhotoForUsername(username, { destroyAsset = false } = {}) {
  if (!username) return;
  await ensureUserProfilePhotoColumns();
  const existing = await query(
    `SELECT profile_picture, profile_picture_cloudinary_id FROM users WHERE username = $1`,
    [username]
  );
  if (existing.rows.length === 0) return;

  if (destroyAsset) {
    await removeStoredUserProfilePhoto({
      profile_picture: existing.rows[0].profile_picture,
      profile_picture_cloudinary_id: existing.rows[0].profile_picture_cloudinary_id,
    });
  }

  await query(
    `UPDATE users
     SET profile_picture = NULL,
         profile_picture_cloudinary_id = NULL,
         updated_at = NOW()
     WHERE username = $1`,
    [username]
  );
}

module.exports = {
  ensureStaffProfileLinkColumn,
  isTeachingRole,
  syncPhotoFromUserToStaffProfile,
  syncPhotoFromStaffProfileToUser,
  clearStaffProfilePhotoForUser,
  clearUserPhotoForUsername,
  pullUserPhotoIntoStaffProfile,
};
