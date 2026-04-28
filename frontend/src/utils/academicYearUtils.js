/**
 * Academic Year Utilities for Form V and Form VI
 * Handles special academic year logic for Form 5 & 6 streams
 */

/**
 * Determines if a form level requires special academic year logic
 * @param {string} formLevel - The form level (e.g., 'FORM V', 'FORM VI')
 * @returns {boolean} - True if the form requires special logic
 */
export const requiresSpecialAcademicYearLogic = (formLevel) => {
  return formLevel === 'FORM V' || formLevel === 'FORM VI';
};

/**
 * Gets the academic year range for Form V and VI based on a given year
 * For Form V/VI, students stay in the same academic year across both terms
 * @param {number} year - The base year (represents the academic year start)
 * @returns {object} - Object containing startYear, endYear, and display range
 */
export const getAcademicYearRange = (year) => {
  // For Form V/VI, the academic year runs from July to June
  // Students who start in July 2025 (First Term) continue through June 2026 (Second Term)
  const startYear = year;
  const endYear = year + 1;

  return {
    startYear,
    endYear,
    displayRange: `${startYear} - ${endYear}`,
    fullDisplay: `July ${startYear} to June ${endYear}`,
    firstTerm: `July ${startYear} to December ${startYear}`,
    secondTerm: `January ${endYear} to June ${endYear}`
  };
};

/**
 * Gets available academic years for Form V and VI
 * Includes both start year (2025) and end year (2026) options
 * When end year is selected, it shows students from the corresponding academic year
 * @returns {Array} - Array of available academic year objects
 */
export const getFormVVIYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  const seen = new Set();
  
  // Generate years from 2025 onwards (academic year start years)
  for (let startYear = 2025; startYear <= currentYear + 3; startYear++) {
    const academicYear = getAcademicYearRange(startYear);
    const endYear = startYear + 1;
    
    // Add start year option (e.g., 2025)
    if (!seen.has(startYear)) {
      years.push({
        year: startYear,
        ...academicYear,
        displayLabel: `${startYear} (${academicYear.displayRange})`
      });
      seen.add(startYear);
    }
    
    // Add end year option (e.g., 2026) that shows same academic year
    // This allows searching "2026" to see students from 2025-2026 academic year
    if (!seen.has(endYear) && endYear <= currentYear + 4) {
      years.push({
        year: endYear,
        ...academicYear, // Same academic year range
        displayLabel: `${endYear} (${academicYear.displayRange})`,
        isEndYear: true, // Flag to indicate this is the end year option
        actualYear: startYear // The actual year to use for API calls
      });
      seen.add(endYear);
    }
  }
  
  return years.sort((a, b) => b.year - a.year); // Show most recent first
};

/**
 * Determines the current term based on date
 * @param {Date} date - The date to check (defaults to current date)
 * @returns {object} - Object containing term info
 */
export const getCurrentTerm = (date = new Date()) => {
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();

  // July to December = First Term
  // January to June = Second Term
  if (month >= 7 && month <= 12) {
    return {
      term: 'First Term',
      termNumber: 1,
      academicYearStart: year,
      academicYearEnd: year + 1,
      displayRange: `${year} - ${year + 1}`,
      description: `July ${year} to December ${year} (First Term)`,
      period: `July ${year} - December ${year}`,
      academicYear: year // Students in this term belong to academic year starting this year
    };
  } else {
    return {
      term: 'Second Term',
      termNumber: 2,
      academicYearStart: year - 1,
      academicYearEnd: year,
      displayRange: `${year - 1} - ${year}`,
      description: `January ${year} to June ${year} (Second Term)`,
      period: `January ${year} - June ${year}`,
      academicYear: year - 1 // Students in this term belong to academic year starting last year
    };
  }
};

/**
 * Filters years based on Form V/VI academic year logic
 * @param {Array} years - Array of years to filter
 * @param {string} formLevel - The form level
 * @returns {Array} - Filtered array of years
 */
export const filterYearsForFormVVI = (years, formLevel) => {
  if (!requiresSpecialAcademicYearLogic(formLevel)) {
    return years;
  }
  
  // For Form V/VI, we want to show academic years starting from 2025
  const currentYear = new Date().getFullYear();
  const minYear = 2025;
  const maxYear = currentYear + 3;
  
  return years.filter(year => year >= minYear && year <= maxYear);
};

/**
 * Gets the display text for a Form V/VI year with academic year context
 * @param {number} year - The year
 * @param {string} formLevel - The form level
 * @returns {string} - Display text with academic year information
 */
export const getFormVVIVearDisplay = (year, formLevel) => {
  if (!requiresSpecialAcademicYearLogic(formLevel)) {
    return year.toString();
  }
  
  const academicYear = getAcademicYearRange(year);
  const currentTerm = getCurrentTerm();
  
  // Check if this year matches the current academic year
  if (academicYear.startYear === currentTerm.academicYearStart && 
      academicYear.endYear === currentTerm.academicYearEnd) {
    return `${year} (${currentTerm.term})`;
  }
  
  return `${year} (${academicYear.displayRange})`;
};

/**
 * Determines the correct academic year for a student based on registration year and current date
 * Ensures students continue in the same academic year across both terms
 * @param {number} registrationYear - The year the student was registered (e.g., 2025)
 * @param {string} formLevel - The form level (FORM V or FORM VI)
 * @returns {object} - Academic year information
 */
export const getStudentAcademicYear = (registrationYear, formLevel) => {
  if (!requiresSpecialAcademicYearLogic(formLevel)) {
    return {
      year: registrationYear,
      academicYearStart: registrationYear,
      academicYearEnd: registrationYear + 1,
      displayRange: `${registrationYear} - ${registrationYear + 1}`
    };
  }
  
  const currentTerm = getCurrentTerm();
  const registrationAcademicYear = getAcademicYearRange(registrationYear);

  // If student was registered in First Term (Jul-Dec), they belong to that academic year
  // If student was registered in Second Term (Jan-June), they belong to previous academic year's start
  if (currentTerm.termNumber === 2) {
    // We're in Second Term (Jan-June)
    // Students should belong to academic year that started last year
    if (registrationYear === currentTerm.academicYearStart) {
      return registrationAcademicYear;
    }
  }
  
  // Default to registration year's academic year
  return registrationAcademicYear;
};

/**
 * Gets the correct year to use for API calls based on current date and student context
 * This ensures students are fetched using the correct academic year context
 * @param {number} displayYear - The year shown in UI (e.g., 2026)
 * @param {string} formLevel - The form level
 * @returns {number} - The year to use for API calls
 */
export const getApiYearForFormVVI = (displayYear, formLevel) => {
  if (!requiresSpecialAcademicYearLogic(formLevel)) {
    return displayYear;
  }
  
  // Check if displayYear is an end year (e.g., 2026) of an academic year
  // AND it's not 2025 (which should always be treated as a start year)
  // This handles the case where user selects "2026" to see students from "2025-2026" academic year
  if (displayYear > 2025) {
    const previousYearAcademicYear = getAcademicYearRange(displayYear - 1);
    if (previousYearAcademicYear.endYear === displayYear) {
      // This is an end year, use the start year for API calls
      return previousYearAcademicYear.startYear;
    }
  }
  
  // Otherwise, treat it as a start year (e.g., 2025, 2027, etc.)
  // Start years: 2025, 2027, 2028, etc. (academic year start)
  return displayYear;
};
