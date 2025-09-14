import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { getWorkspaceRoot } from "./workspace.service.js";

export type OnboardingMode = 'Default' | 'Onboarding';

interface BackupMetadata {
  timestamp: string;
  originalPath: string;
  backupPath: string;
  fileCount: number;
  checksum?: string;
}

export class OnboardingModeService {
  private static instance: OnboardingModeService;
  private currentMode: OnboardingMode = 'Default';
  private readonly STEERING_DIR = '.kiro/steering';
  private readonly BACKUP_BASE_DIR = '.constellation/steering/.backups';
  private readonly ONBOARDING_PERSONA_FILE = 'onboarding-guide.md';
  private readonly PERSONA_SOURCE_PATH = 'src/personas/onboarding.md';

  private constructor() {}

  public static getInstance(): OnboardingModeService {
    if (!OnboardingModeService.instance) {
      OnboardingModeService.instance = new OnboardingModeService();
    }
    return OnboardingModeService.instance;
  }

  /**
   * Get the current onboarding mode
   */
  public async getCurrentMode(): Promise<OnboardingMode> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      return this.currentMode;
    }

    const steeringDir = path.join(workspaceRoot, this.STEERING_DIR);
    const onboardingPersonaPath = path.join(steeringDir, this.ONBOARDING_PERSONA_FILE);

    try {
      // Check if onboarding persona file exists to determine mode
      await fs.promises.access(onboardingPersonaPath, fs.constants.F_OK);
      this.currentMode = 'Onboarding';
    } catch {
      this.currentMode = 'Default';
    }

    return this.currentMode;
  }

  /**
   * Switch to Onboarding mode by backing up steering docs and writing persona file
   */
  public async switchToOnboarding(): Promise<void> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      throw new Error('No workspace folder open. Cannot switch to Onboarding mode.');
    }

    try {
      // Create backup of current steering documents
      const backupPath = await this.backupSteeringDocs();
      
      // Write the onboarding persona file
      await this.writeOnboardingPersona();
      
      this.currentMode = 'Onboarding';
      
      vscode.window.showInformationMessage(
        `Switched to Onboarding mode. Steering documents backed up to: ${path.relative(workspaceRoot, backupPath)}`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      vscode.window.showErrorMessage(`Failed to switch to Onboarding mode: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Switch to Default mode by restoring the most recent backup
   */
  public async switchToDefault(): Promise<void> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      throw new Error('No workspace folder open. Cannot switch to Default mode.');
    }

    try {
      // Restore the most recent backup
      await this.restoreSteeringDocs();
      
      this.currentMode = 'Default';
      
      vscode.window.showInformationMessage('Switched to Default mode. Steering documents restored from backup.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      vscode.window.showErrorMessage(`Failed to switch to Default mode: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Create a timestamped backup of the entire .kiro/steering directory
   * Returns the backup directory path
   */
  public async backupSteeringDocs(): Promise<string> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      throw new Error('No workspace folder open. Cannot create backup.');
    }

    const steeringDir = path.join(workspaceRoot, this.STEERING_DIR);
    const backupBaseDir = path.join(workspaceRoot, this.BACKUP_BASE_DIR);
    
    // Check if steering directory exists
    try {
      await fs.promises.access(steeringDir, fs.constants.F_OK);
    } catch {
      // If steering directory doesn't exist, create an empty backup
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(backupBaseDir, timestamp);
      await fs.promises.mkdir(backupDir, { recursive: true });
      return backupDir;
    }

    // Check if we need to create a backup (idempotence check)
    const needsBackup = await this.shouldCreateBackup(steeringDir, backupBaseDir);
    if (!needsBackup) {
      // Return the most recent backup path
      const mostRecentBackup = await this.findMostRecentBackup(backupBaseDir);
      if (mostRecentBackup) {
        return mostRecentBackup;
      }
    }

    // Create timestamped backup directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(backupBaseDir, timestamp);
    
    // Ensure backup base directory exists
    await fs.promises.mkdir(backupBaseDir, { recursive: true });
    
    // Recursively copy steering directory to backup
    await this.copyDirectoryRecursive(steeringDir, backupDir);
    
    // Create backup metadata
    const fileCount = await this.countFilesRecursive(backupDir);
    const metadata: BackupMetadata = {
      timestamp,
      originalPath: steeringDir,
      backupPath: backupDir,
      fileCount
    };
    
    const metadataPath = path.join(backupDir, '.backup-metadata.json');
    await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    
    return backupDir;
  }

  /**
   * Restore steering documents from the most recent backup
   */
  public async restoreSteeringDocs(): Promise<void> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      throw new Error('No workspace folder open. Cannot restore backup.');
    }

    const backupBaseDir = path.join(workspaceRoot, this.BACKUP_BASE_DIR);
    const steeringDir = path.join(workspaceRoot, this.STEERING_DIR);
    
    // Find the most recent backup
    const mostRecentBackup = await this.findMostRecentBackup(backupBaseDir);
    if (!mostRecentBackup) {
      throw new Error('No backup found to restore from.');
    }

    try {
      // Remove current steering directory if it exists
      try {
        await fs.promises.access(steeringDir, fs.constants.F_OK);
        await fs.promises.rm(steeringDir, { recursive: true, force: true });
      } catch {
        // Directory doesn't exist, which is fine
      }

      // Restore from backup (excluding metadata file)
      await this.copyDirectoryRecursive(mostRecentBackup, steeringDir, ['.backup-metadata.json']);
      
    } catch (error) {
      throw new Error(`Failed to restore steering documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Write the onboarding persona file to the steering directory
   */
  private async writeOnboardingPersona(): Promise<void> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      throw new Error('No workspace folder open.');
    }

    const steeringDir = path.join(workspaceRoot, this.STEERING_DIR);
    const personaSourcePath = path.join(workspaceRoot, this.PERSONA_SOURCE_PATH);
    const personaTargetPath = path.join(steeringDir, this.ONBOARDING_PERSONA_FILE);

    try {
      // Ensure steering directory exists
      await fs.promises.mkdir(steeringDir, { recursive: true });

      // Read the persona template
      const personaContent = await fs.promises.readFile(personaSourcePath, 'utf8');
      
      // Write to steering directory
      await fs.promises.writeFile(personaTargetPath, personaContent, 'utf8');
    } catch (error) {
      throw new Error(`Failed to write onboarding persona: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a backup should be created (idempotence check)
   */
  private async shouldCreateBackup(steeringDir: string, backupBaseDir: string): Promise<boolean> {
    try {
      const mostRecentBackup = await this.findMostRecentBackup(backupBaseDir);
      if (!mostRecentBackup) {
        return true; // No previous backup exists
      }

      // Compare content to see if anything has changed
      const hasChanges = await this.hasDirectoryChanged(steeringDir, mostRecentBackup);
      return hasChanges;
    } catch {
      return true; // If we can't determine, create a backup to be safe
    }
  }

  /**
   * Find the most recent backup directory
   */
  private async findMostRecentBackup(backupBaseDir: string): Promise<string | null> {
    try {
      const entries = await fs.promises.readdir(backupBaseDir, { withFileTypes: true });
      const backupDirs = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort()
        .reverse(); // Most recent first (ISO timestamps sort correctly)

      return backupDirs.length > 0 ? path.join(backupBaseDir, backupDirs[0]) : null;
    } catch {
      return null;
    }
  }

  /**
   * Check if directory content has changed compared to backup
   */
  private async hasDirectoryChanged(currentDir: string, backupDir: string): Promise<boolean> {
    try {
      const currentFiles = await this.getDirectoryFileList(currentDir);
      const backupFiles = await this.getDirectoryFileList(backupDir, ['.backup-metadata.json']);
      
      // Quick check: different number of files
      if (currentFiles.length !== backupFiles.length) {
        return true;
      }

      // Check if file lists are different
      const currentSet = new Set(currentFiles);
      const backupSet = new Set(backupFiles);
      
      for (const file of currentFiles) {
        if (!backupSet.has(file)) {
          return true;
        }
      }

      // Check file contents for changes
      for (const relativePath of currentFiles) {
        const currentFilePath = path.join(currentDir, relativePath);
        const backupFilePath = path.join(backupDir, relativePath);
        
        try {
          const currentContent = await fs.promises.readFile(currentFilePath, 'utf8');
          const backupContent = await fs.promises.readFile(backupFilePath, 'utf8');
          
          if (currentContent !== backupContent) {
            return true;
          }
        } catch {
          return true; // If we can't read files, assume changed
        }
      }

      return false; // No changes detected
    } catch {
      return true; // If we can't determine, assume changed
    }
  }

  /**
   * Get a list of all files in a directory recursively
   */
  private async getDirectoryFileList(dir: string, excludeFiles: string[] = []): Promise<string[]> {
    const files: string[] = [];
    
    const processDirectory = async (currentDir: string, relativePath: string = '') => {
      const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const entryPath = path.join(relativePath, entry.name);
        
        if (excludeFiles.includes(entry.name)) {
          continue;
        }
        
        if (entry.isDirectory()) {
          await processDirectory(path.join(currentDir, entry.name), entryPath);
        } else {
          files.push(entryPath);
        }
      }
    };

    await processDirectory(dir);
    return files.sort();
  }

  /**
   * Recursively copy a directory
   */
  private async copyDirectoryRecursive(src: string, dest: string, excludeFiles: string[] = []): Promise<void> {
    await fs.promises.mkdir(dest, { recursive: true });
    
    const entries = await fs.promises.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      if (excludeFiles.includes(entry.name)) {
        continue;
      }
      
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectoryRecursive(srcPath, destPath, excludeFiles);
      } else {
        await fs.promises.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * Count files recursively in a directory
   */
  private async countFilesRecursive(dir: string): Promise<number> {
    let count = 0;
    
    const processDirectory = async (currentDir: string) => {
      const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          await processDirectory(path.join(currentDir, entry.name));
        } else {
          count++;
        }
      }
    };

    await processDirectory(dir);
    return count;
  }
}

// Export convenience functions for easier usage
export const onboardingModeService = OnboardingModeService.getInstance();

export async function getCurrentMode(): Promise<OnboardingMode> {
  return onboardingModeService.getCurrentMode();
}

export async function switchToOnboarding(): Promise<void> {
  return onboardingModeService.switchToOnboarding();
}

export async function switchToDefault(): Promise<void> {
  return onboardingModeService.switchToDefault();
}