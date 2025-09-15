import * as path from 'path';
import * as vscode from 'vscode';
import { getWorkspaceRoot } from './workspace.service.js';

/**
 * Security service for path validation and workspace boundary enforcement
 */
export class SecurityService {
  private static readonly ALLOWED_CONSTELLATION_SUBDIRS = [
    'onboarding',
    'steering/backup',
    'data',
    'oss'
  ];

  private static readonly MAX_PATH_LENGTH = 260; // Windows MAX_PATH limit
  private static readonly MAX_JSON_SIZE = 1024 * 1024; // 1MB
  private static readonly MAX_FILENAME_LENGTH = 255;

  /**
   * Validates that a file path is safe and within workspace boundaries
   * @param filePath - The file path to validate (can be relative or absolute)
   * @param workspaceRoot - The workspace root directory
   * @param requireConstellationSubdir - Whether the path must be within .constellation subdirectories
   * @returns The normalized, workspace-relative path
   * @throws Error if path is invalid or unsafe
   */
  static validateAndNormalizePath(
    filePath: string, 
    workspaceRoot: string, 
    requireConstellationSubdir: boolean = false
  ): string {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Path must be a non-empty string');
    }

    if (filePath.trim().length === 0) {
      throw new Error('Path cannot be empty or whitespace-only');
    }

    if (filePath.length > this.MAX_PATH_LENGTH) {
      throw new Error(`Path length exceeds maximum allowed length of ${this.MAX_PATH_LENGTH} characters`);
    }

    // Check for dangerous characters and sequences
    if (this.containsDangerousSequences(filePath)) {
      this.logSecurityViolation('Directory traversal attempt', { filePath });
      throw new Error('Path contains dangerous sequences (directory traversal attempt)');
    }

    // Normalize the path to handle different separators and resolve . and .. sequences
    let normalizedPath: string;
    try {
      normalizedPath = path.normalize(filePath).replace(/\\/g, '/');
    } catch (error) {
      throw new Error(`Failed to normalize path: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Additional check after normalization for directory traversal
    if (normalizedPath.includes('../') || normalizedPath.startsWith('../') || normalizedPath === '..') {
      this.logSecurityViolation('Directory traversal after normalization', { originalPath: filePath, normalizedPath });
      throw new Error('Path resolves to directory traversal (outside workspace)');
    }

    // Convert to absolute path for boundary checking
    let absolutePath: string;
    try {
      if (path.isAbsolute(normalizedPath)) {
        absolutePath = normalizedPath;
      } else {
        absolutePath = path.resolve(workspaceRoot, normalizedPath);
      }
    } catch (error) {
      throw new Error(`Failed to resolve absolute path: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Ensure the resolved path is within the workspace
    if (!absolutePath.startsWith(workspaceRoot)) {
      this.logSecurityViolation('Path outside workspace boundaries', { 
        filePath, 
        absolutePath, 
        workspaceRoot 
      });
      throw new Error('Path is outside workspace boundaries');
    }

    // Convert back to workspace-relative path
    const relativePath = path.relative(workspaceRoot, absolutePath).replace(/\\/g, '/');

    // If constellation subdirectory is required, validate it
    if (requireConstellationSubdir) {
      this.validateConstellationPath(relativePath);
    }

    // Validate filename length
    const filename = path.basename(relativePath);
    if (filename.length > this.MAX_FILENAME_LENGTH) {
      throw new Error(`Filename exceeds maximum allowed length of ${this.MAX_FILENAME_LENGTH} characters`);
    }

    return relativePath;
  }

  /**
   * Validates that a path is within allowed .constellation subdirectories
   * @param relativePath - Workspace-relative path
   * @throws Error if path is not within allowed constellation subdirectories
   */
  static validateConstellationPath(relativePath: string): void {
    if (!relativePath.startsWith('.constellation/')) {
      throw new Error('Path must be within .constellation directory');
    }

    const subPath = relativePath.substring('.constellation/'.length);
    const isAllowed = this.ALLOWED_CONSTELLATION_SUBDIRS.some(allowedDir => 
      subPath.startsWith(allowedDir) || subPath === allowedDir.split('/')[0]
    );

    if (!isAllowed) {
      this.logSecurityViolation('Access to unauthorized constellation subdirectory', { 
        relativePath, 
        subPath,
        allowedDirs: this.ALLOWED_CONSTELLATION_SUBDIRS 
      });
      throw new Error(`Access denied: path not in allowed .constellation subdirectories`);
    }
  }

  /**
   * Validates JSON input size and structure
   * @param jsonString - The JSON string to validate
   * @param maxSize - Maximum allowed size in bytes (defaults to 1MB)
   * @returns Parsed JSON object
   * @throws Error if JSON is invalid or too large
   */
  static validateJsonInput(jsonString: string, maxSize: number = this.MAX_JSON_SIZE): any {
    if (!jsonString || typeof jsonString !== 'string') {
      throw new Error('JSON input must be a non-empty string');
    }

    if (jsonString.length > maxSize) {
      this.logSecurityViolation('JSON size limit exceeded', { 
        size: jsonString.length, 
        maxSize 
      });
      throw new Error(`JSON input exceeds maximum size of ${maxSize} bytes`);
    }

    try {
      return JSON.parse(jsonString);
    } catch (error) {
      throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'Parse error'}`);
    }
  }

  /**
   * Sanitizes and validates chosenAction parameter
   * @param chosenAction - The action to validate
   * @returns Sanitized action or null
   */
  static sanitizeChosenAction(chosenAction: any): 'document' | 'test-plan' | null {
    if (chosenAction === null || chosenAction === undefined) {
      return null;
    }

    if (typeof chosenAction !== 'string') {
      return null; // Invalid type, default to null
    }

    const trimmed = chosenAction.trim().toLowerCase();
    
    switch (trimmed) {
      case 'document':
        return 'document';
      case 'test-plan':
        return 'test-plan';
      default:
        return null; // Invalid value, default to null
    }
  }

  /**
   * Validates workspace exists and returns root path
   * @returns Workspace root path
   * @throws Error if no workspace is open
   */
  static validateWorkspace(): string {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      throw new Error('No workspace folder open. A workspace is required for this operation.');
    }
    return workspaceRoot;
  }

  /**
   * Checks if a path contains dangerous sequences
   * @param filePath - Path to check
   * @returns True if path contains dangerous sequences
   */
  private static containsDangerousSequences(filePath: string): boolean {
    const dangerousPatterns = [
      /\.\./,           // Directory traversal
      /[<>:"|?*]/,      // Invalid filename characters on Windows
      /[\x00-\x1f]/,    // Control characters
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Windows reserved names
      /\.$|\.$/,        // Trailing dots (Windows issue)
      /\s$/,            // Trailing spaces (Windows issue)
    ];

    return dangerousPatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * Logs security violations for monitoring and debugging
   * @param violation - Description of the security violation
   * @param context - Additional context information
   */
  private static logSecurityViolation(violation: string, context: Record<string, any>): void {
    const sanitizedContext = this.sanitizeLogContext(context);
    console.warn(`[SECURITY] ${violation}:`, sanitizedContext);
    
    // Also log to VS Code output channel for visibility
    const outputChannel = vscode.window.createOutputChannel('Constellation Security');
    outputChannel.appendLine(`[${new Date().toISOString()}] SECURITY VIOLATION: ${violation}`);
    outputChannel.appendLine(`Context: ${JSON.stringify(sanitizedContext, null, 2)}`);
  }

  /**
   * Sanitizes log context to prevent sensitive data leakage
   * @param context - Raw context object
   * @returns Sanitized context object
   */
  private static sanitizeLogContext(context: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(context)) {
      if (typeof value === 'string') {
        // Sanitize potentially sensitive paths by showing only relative portions
        if (key.includes('Path') || key.includes('path')) {
          sanitized[key] = this.sanitizePath(value);
        } else {
          sanitized[key] = value;
        }
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Sanitizes file paths for logging to prevent information disclosure
   * @param filePath - Path to sanitize
   * @returns Sanitized path
   */
  private static sanitizePath(filePath: string): string {
    try {
      // Only show the last 3 path segments to avoid exposing full system paths
      const segments = filePath.split(/[/\\]/);
      if (segments.length > 3) {
        return '.../' + segments.slice(-3).join('/');
      }
      return filePath;
    } catch {
      return '[REDACTED_PATH]';
    }
  }
}

/**
 * Graceful error handler that completes partial operations when possible
 */
export class GracefulErrorHandler {
  /**
   * Executes multiple operations with graceful error handling
   * @param operations - Array of operations to execute
   * @returns Results with success/failure status for each operation
   */
  static async executeWithGracefulHandling<T>(
    operations: Array<{
      name: string;
      operation: () => Promise<T>;
      critical?: boolean; // If true, failure stops execution
    }>
  ): Promise<Array<{
    name: string;
    success: boolean;
    result?: T;
    error?: string;
  }>> {
    const results: Array<{
      name: string;
      success: boolean;
      result?: T;
      error?: string;
    }> = [];

    for (const { name, operation, critical = false } of operations) {
      try {
        const result = await operation();
        results.push({ name, success: true, result });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ name, success: false, error: errorMessage });
        
        console.warn(`Operation '${name}' failed:`, errorMessage);
        
        // If this is a critical operation, stop execution
        if (critical) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Wraps an async operation with timeout and graceful error handling
   * @param operation - Operation to execute
   * @param timeoutMs - Timeout in milliseconds
   * @param operationName - Name for logging
   * @returns Operation result or null if failed
   */
  static async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    operationName: string
  ): Promise<T | null> {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Operation '${operationName}' timed out after ${timeoutMs}ms`)), timeoutMs);
      });

      return await Promise.race([operation(), timeoutPromise]);
    } catch (error) {
      console.warn(`Operation '${operationName}' failed:`, error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
}