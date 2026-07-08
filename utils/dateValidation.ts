/**
 * CRIT-3 & CRIT-9: UTC-based date comparison utilities
 * All dates are compared in UTC to avoid timezone issues
 */

/**
 * Check if a date string represents a future date (in UTC)
 * @param dateString ISO 8601 date string
 * @returns true if date is in the future, false otherwise
 */
export function isDateInFuture(dateString: string): boolean {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.error('[DateValidation] Invalid date string:', dateString);
      return false;
    }
    
    // Compare UTC timestamps to avoid timezone issues
    return date.getTime() > Date.now();
  } catch (error) {
    console.error('[DateValidation] Error parsing date:', error);
    return false;
  }
}

/**
 * CRIT-3: Check if user is in grace period
 * Validates gracePeriodEndDate and compares in UTC
 */
export function isInGracePeriod(customerInfo: { gracePeriodEndDate?: string }): boolean {
  if (!customerInfo.gracePeriodEndDate) {
    return false; // No grace period if date missing
  }
  
  try {
    const graceEnd = new Date(customerInfo.gracePeriodEndDate);
    const now = new Date();
    
    // Validate date is valid
    if (isNaN(graceEnd.getTime())) {
      console.error('[DateValidation] Invalid gracePeriodEndDate:', customerInfo.gracePeriodEndDate);
      return false;
    }
    
    // Compare in UTC to avoid timezone issues
    const graceEndUTC = Date.UTC(
      graceEnd.getUTCFullYear(),
      graceEnd.getUTCMonth(),
      graceEnd.getUTCDate(),
      graceEnd.getUTCHours(),
      graceEnd.getUTCMinutes(),
      graceEnd.getUTCSeconds()
    );
    const nowUTC = Date.now();
    
    // Allow access if grace period hasn't ended yet (with 1-minute buffer for clock skew)
    return graceEndUTC > (nowUTC - 60000);
  } catch (error) {
    console.error('[DateValidation] Error checking grace period:', error);
    return false; // Fail closed - deny access on error
  }
}
