/**
 * Input validation schemas for edge functions
 * Using simple validation since we need Deno-compatible code
 */

// UUID v4 pattern
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// University ID pattern (alphanumeric, max 50 chars)
const UNIVERSITY_ID_PATTERN = /^[a-zA-Z0-9_-]{1,50}$/;

// Valid job scopes
const VALID_SCOPES = ['ALL_UNIVERSITIES', 'SINGLE_UNIVERSITY'] as const;

export type JobScope = typeof VALID_SCOPES[number];

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface StartJobInput {
  scope: JobScope;
  universityId?: string;
}

export interface ScrapeUniversityInput {
  jobId: string;
  universityId: string;
}

/**
 * Validates UUID format
 */
export function isValidUUID(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

/**
 * Validates university ID format
 */
export function isValidUniversityId(value: unknown): value is string {
  return typeof value === 'string' && UNIVERSITY_ID_PATTERN.test(value);
}

/**
 * Validates job scope
 */
export function isValidScope(value: unknown): value is JobScope {
  return typeof value === 'string' && VALID_SCOPES.includes(value as JobScope);
}

/**
 * Validates start-scrape-job input
 */
export function validateStartJobInput(input: unknown): ValidationResult<StartJobInput> {
  if (!input || typeof input !== 'object') {
    return { success: false, error: 'Request body must be a valid JSON object' };
  }
  
  const data = input as Record<string, unknown>;
  
  // Validate scope
  if (!isValidScope(data.scope)) {
    return { 
      success: false, 
      error: `Invalid scope. Must be one of: ${VALID_SCOPES.join(', ')}` 
    };
  }
  
  // If SINGLE_UNIVERSITY, universityId is required
  if (data.scope === 'SINGLE_UNIVERSITY') {
    if (!data.universityId) {
      return { 
        success: false, 
        error: 'universityId is required when scope is SINGLE_UNIVERSITY' 
      };
    }
    
    if (!isValidUniversityId(data.universityId)) {
      return { 
        success: false, 
        error: 'Invalid universityId format. Must be alphanumeric, 1-50 characters' 
      };
    }
  }
  
  // If ALL_UNIVERSITIES, universityId should not be provided
  if (data.scope === 'ALL_UNIVERSITIES' && data.universityId) {
    return { 
      success: false, 
      error: 'universityId should not be provided when scope is ALL_UNIVERSITIES' 
    };
  }
  
  return {
    success: true,
    data: {
      scope: data.scope as JobScope,
      universityId: data.universityId as string | undefined
    }
  };
}

/**
 * Validates scrape-university input
 */
export function validateScrapeUniversityInput(input: unknown): ValidationResult<ScrapeUniversityInput> {
  if (!input || typeof input !== 'object') {
    return { success: false, error: 'Request body must be a valid JSON object' };
  }
  
  const data = input as Record<string, unknown>;
  
  // Validate jobId
  if (!data.jobId) {
    return { success: false, error: 'jobId is required' };
  }
  
  if (!isValidUUID(data.jobId)) {
    return { success: false, error: 'Invalid jobId format. Must be a valid UUID' };
  }
  
  // Validate universityId
  if (!data.universityId) {
    return { success: false, error: 'universityId is required' };
  }
  
  if (!isValidUniversityId(data.universityId)) {
    return { 
      success: false, 
      error: 'Invalid universityId format. Must be alphanumeric, 1-50 characters' 
    };
  }
  
  return {
    success: true,
    data: {
      jobId: data.jobId as string,
      universityId: data.universityId as string
    }
  };
}
