import { google } from 'googleapis';
import path from 'path';
import { readFileSync } from 'fs';

/**
 * Create a Drive client using Service Account (like Studychill does).
 * This doesn't require user OAuth tokens for Drive access.
 */
let _serviceAccountDrive = null;

export function getServiceAccountDriveClient() {
  if (_serviceAccountDrive) return _serviceAccountDrive;

  let serviceAccountKey;

  // 1. Try to read from environment variable first (recommended for Vercel/production)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    } catch (err) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY env variable is not a valid JSON string.');
    }
  } else {
    // 2. Fall back to local file (for local development)
    const serviceAccountPath = path.join(process.cwd(), 'service-account-drive.json');
    try {
      serviceAccountKey = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    } catch (err) {
      throw new Error(
        `Google Service Account credentials not found. ` +
        `Please set GOOGLE_SERVICE_ACCOUNT_KEY env variable or place service-account-drive.json at ${serviceAccountPath}.`
      );
    }
  }

  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccountKey,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  _serviceAccountDrive = google.drive({ version: 'v3', auth });
  return _serviceAccountDrive;
}

/**
 * Create a Drive client using user's OAuth access token (for sharing/permissions)
 */
export function getUserDriveClient(accessToken) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth });
}

/**
 * List subfolders of a given folder ID using service account
 */
async function listSubfolders(drive, folderId) {
  const folders = [];
  let pageToken = null;

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'nextPageToken, files(id, name, mimeType)',
      pageSize: 100,
      pageToken: pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      orderBy: 'name',
    });

    folders.push(...(response.data.files || []));
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return folders;
}

/**
 * Load folder tree up to specified depth
 */
async function loadFolderTreeRecursive(drive, folderId, currentDepth, maxDepth) {
  if (currentDepth > maxDepth) return [];

  const subfolders = await listSubfolders(drive, folderId);
  
  const result = [];
  for (const folder of subfolders) {
    const node = {
      id: folder.id,
      name: folder.name,
      children: [],
    };

    if (currentDepth < maxDepth) {
      node.children = await loadFolderTreeRecursive(drive, folder.id, currentDepth + 1, maxDepth);
    }

    result.push(node);
  }

  return result;
}

/**
 * Load the complete folder structure from the two root folders.
 * Uses SERVICE ACCOUNT - no user token needed.
 * 
 * Returns a tree with:
 * - Level 1 (root): Skipped, we start from its children
 * - Level 2: Subject names (môn học) - filtered to exclude "Tài Liệu Tổng Hợp"
 * - Level 3: Teacher names (giáo viên)
 */
/**
 * Load the complete folder structure from the two root folders.
 * Uses SERVICE ACCOUNT - no user token needed.
 * Recursively loads all 3 levels (Roots -> Subjects -> Teachers).
 */
export async function loadFullDriveFolderTree() {
  const drive = getServiceAccountDriveClient();
  
  const folderIds = [
    process.env.DRIVE_FOLDER_1,
    process.env.DRIVE_FOLDER_2,
  ].filter(Boolean);

  const allTrees = [];

  for (const rootId of folderIds) {
    try {
      // Get root folder name
      const rootInfo = await drive.files.get({
        fileId: rootId,
        fields: 'id, name',
        supportsAllDrives: true,
      });

      // Load 2 levels deep (subjects -> teachers)
      const children = await loadFolderTreeRecursive(drive, rootId, 1, 2);

      // Filter out "Tài Liệu Tổng Hợp" at Level 2 (Subjects)
      const filteredChildren = children.filter(
        (child) => child.name && child.name.toLowerCase().trim() !== 'tài liệu tổng hợp'
      );

      allTrees.push({
        id: rootId,
        name: rootInfo.data.name,
        children: filteredChildren,
      });
    } catch (error) {
      console.error(`Error loading folder ${rootId}:`, error.message);
      allTrees.push({
        id: rootId,
        name: `Folder ${rootId}`,
        children: [],
        error: error.message,
      });
    }
  }

  return allTrees;
}

/**
 * Share a folder with an email address (reader permission).
 * Uses SERVICE ACCOUNT for consistency.
 */
export async function shareFolderWithEmail(folderId, email) {
  const drive = getServiceAccountDriveClient();

  try {
    await drive.permissions.create({
      fileId: folderId,
      requestBody: {
        type: 'user',
        role: 'reader',
        emailAddress: email,
      },
      sendNotificationEmail: false,
      supportsAllDrives: true,
    });

    return { success: true, folderId };
  } catch (error) {
    console.error(`Error sharing folder ${folderId} with ${email}:`, error.message);
    return { 
      success: false, 
      folderId, 
      error: error.message 
    };
  }
}

/**
 * Share multiple folders with an email
 */
export async function shareMultipleFolders(folderIds, email) {
  // Share all folders in parallel to minimize response time
  return Promise.all(
    folderIds.map(folderId => shareFolderWithEmail(folderId, email))
  );
}
