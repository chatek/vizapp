import { join } from 'node:path'

/**
 * Home-relative root for agent-sdk state (spool, credentials, pears, identity).
 * The generic app (id 'vclaw') keeps agent-sdk's legacy split layout —
 * ~/.vclaw for the spool, ~/.config/vclaw for credentials — byte-for-byte;
 * a member product roots ALL of it under ~/.<profile-id> instead, and the
 * child gets that root via VCLAW_HOME (explicit per-family env vars and CLI
 * flags still win inside agent-sdk).
 */
export function vclawSdkRootDirName(profileId: string): string | null {
  return profileId === 'vclaw' ? null : `.${profileId}`
}

let sdkRootDir: string | null = vclawSdkRootDirName('vclaw')

/**
 * Pins the agent-sdk root from the active product profile. Called once at
 * startup, right after the profile loads and before any spool/credential
 * path is resolved or any harness child is spawned.
 */
export function setVclawSdkRootDirectory(profileId: string): void {
  sdkRootDir = vclawSdkRootDirName(profileId)
}

/** The pinned agent-sdk root, relative to the user's home; null = legacy layout. */
export function vclawSdkRootDirectory(): string | null {
  return sdkRootDir
}

/** Directory holding the durable inbox spool for the active profile. */
export function inboxSpoolDirectory(home: string): string {
  return sdkRootDir ? join(home, sdkRootDir, 'inbox') : join(home, '.vclaw', 'inbox')
}

/** Path of the agent-sdk credentials file for the active profile. */
export function vclawCredentialsPath(home: string): string {
  return sdkRootDir
    ? join(home, sdkRootDir, 'config', 'credentials.json')
    : join(home, '.config', 'vclaw', 'credentials.json')
}
