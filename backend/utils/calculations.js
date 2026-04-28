/**
 * Calculation Utilities for Results & Reports
 * Implements all calculation techniques as per documentation
 */

/**
 * Calculate grade from average score
 * @param {number} average - Average score
 * @param {string} level - Form level (e.g., "FORM I", "FORM V")
 * @returns {string} Grade letter (A-F for O-Level, A-F-E-S for A-Level)
 */
function calculateGrade(average, level) {
  const normalizedLevel = level.toUpperCase();
  const isALevel = normalizedLevel.includes('FORM V') || normalizedLevel.includes('FORM VI');
  
  if (isALevel) {
    // A-Level grading
    if (average >= 85) return 'A';
    if (average >= 75) return 'B';
    if (average >= 65) return 'C';
    if (average >= 55) return 'D';
    if (average >= 45) return 'E';
    if (average >= 40) return 'S';
    return 'F';
  } else {
    // O-Level grading
    if (average >= 85) return 'A';
    if (average >= 70) return 'B';
    if (average >= 50) return 'C';  // Fixed: was 55, should be 50
    if (average >= 40) return 'D';
    return 'F';
  }
}

/**
 * Get Swahili remarks based on grade
 * @param {string} grade - Grade letter
 * @param {string} level - Form level
 * @returns {string} Swahili remark
 */
function getSwahiliRemarks(grade, level) {
  const normalizedLevel = level.toUpperCase();
  const isALevel = normalizedLevel.includes('FORM V') || normalizedLevel.includes('FORM VI');
  
  const remarks = {
    'A': 'Bora Sana',
    'B': 'Vizuri Sana',
    'C': 'Vizuri',
    'D': 'Dhaifu',
    'E': isALevel ? 'Wastani' : 'Feli',
    'S': isALevel ? 'Kidogo' : 'Feli',
    'F': 'Feli'
  };
  
  return remarks[grade] || 'Feli';
}

/**
 * Calculate O-Level division point using seven best subject grades
 * @param {Object} subjectsData - Object mapping subject_code to {grade, weighted_total}
 * @returns {number} Division point (7-35)
 */
function calculateOLevelDivisionPoint(subjectsData) {
  const gradeValueMap = {
    'A': 1,
    'B': 2,
    'C': 3,
    'D': 4,
    'F': 5
  };
  
  // Convert all subject grades to grade values
  const gradeValues = [];
  for (const subjectCode in subjectsData) {
    const subjectData = subjectsData[subjectCode];
    const grade = subjectData.grade || 'F';
    const gradeValue = gradeValueMap[grade] || 5;
    gradeValues.push(gradeValue);
  }
  
  // Sort in ascending order (best grades first)
  gradeValues.sort((a, b) => a - b);
  
  // Take seven highest (lowest values = best grades)
  const sevenHighest = gradeValues.slice(0, 7);
  
  // Sum the seven grade values
  const divisionPoint = sevenHighest.reduce((sum, val) => sum + val, 0);
  
  return divisionPoint;
}

/**
 * Calculate A-Level division point using three combination subjects
 * @param {Object} subjectsData - Object mapping subject_code to {grade, weighted_total, name}
 * @param {string} stream - Stream/combination (PCM, PCB, EGM, HGE, HGL)
 * @returns {number|null} Division point (3-21) or null if combination cannot be determined
 */
function calculateALevelDivisionPoint(subjectsData, stream) {
  const gradeValueMap = {
    'A': 1,
    'B': 2,
    'C': 3,
    'D': 4,
    'E': 5,
    'S': 6,
    'F': 7
  };
  
  // Combination subject codes
  const combinations = {
    'PCM': ['PHY', 'CHE', 'ADV'],
    'PCB': ['PHY', 'CHE', 'BIO'],
    'EGM': ['ECO', 'GEO', 'ADV'],
    'HGE': ['HIS', 'GEO', 'ECO'],
    'HGL': ['HIS', 'GEO', 'ENG'], // History, Geography, Literature/English
    'HKL': ['HIS', 'KIS', 'ENG']  // History, Kiswahili, Literature/English
  };
  
  // Auto-detect combination if stream not provided
  let detectedStream = stream;
  if (!detectedStream) {
    detectedStream = detectCombinationFromSubjects(subjectsData);
  }
  
  if (!detectedStream || !combinations[detectedStream]) {
    return null;
  }
  
  const combinationSubjects = combinations[detectedStream];
  const comboBestGrades = {};
  
  // Match subjects to combination codes
  for (const subjectCode in subjectsData) {
    const subjectData = subjectsData[subjectCode];
    const grade = subjectData.grade || 'F';
    const gradeValue = gradeValueMap[grade] || 7;
    const subjectName = (subjectData.name || '').toUpperCase();
    
    // Match subject to combination code
    for (const comboCode of combinationSubjects) {
      if (matchesSubject(subjectCode, subjectName, comboCode)) {
        // Keep best grade if multiple matches
        if (!comboBestGrades[comboCode] || gradeValue < comboBestGrades[comboCode]) {
          comboBestGrades[comboCode] = gradeValue;
        }
        break;
      }
    }
  }
  
  // Must have exactly 3 subjects
  const gradeValues = Object.values(comboBestGrades);
  if (gradeValues.length !== 3) {
    return null;
  }
  
  // Sort and sum
  gradeValues.sort((a, b) => a - b);
  const divisionPoint = gradeValues.reduce((sum, val) => sum + val, 0);
  
  return divisionPoint;
}

/**
 * Detect combination from subjects
 * @param {Object} subjectsData - Object mapping subject_code to subject data
 * @returns {string|null} Detected combination or null
 */
function detectCombinationFromSubjects(subjectsData) {
  const subjectCodes = Object.keys(subjectsData).map(code => code.toUpperCase());
  const subjectNames = Object.values(subjectsData).map(s => (s.name || '').toUpperCase());
  
  // Check for PCM (Physics, Chemistry, Advanced Math)
  if (
    (subjectCodes.some(c => c.includes('PHY')) || subjectNames.some(n => n.includes('PHYSICS'))) &&
    (subjectCodes.some(c => c.includes('CHE')) || subjectNames.some(n => n.includes('CHEMISTRY'))) &&
    (subjectCodes.some(c => c.includes('ADV') || c.includes('MATH')) || subjectNames.some(n => n.includes('ADVANCED') || n.includes('MATH'))) &&
    !(subjectCodes.some(c => c.includes('BASIC')) || subjectNames.some(n => n.includes('BASIC'))) // Exclude Basic Math
  ) {
    return 'PCM';
  }
  
  // Check for PCB (Physics, Chemistry, Biology)
  if (
    (subjectCodes.some(c => c.includes('PHY')) || subjectNames.some(n => n.includes('PHYSICS'))) &&
    (subjectCodes.some(c => c.includes('CHE')) || subjectNames.some(n => n.includes('CHEMISTRY'))) &&
    (subjectCodes.some(c => c.includes('BIO')) || subjectNames.some(n => n.includes('BIOLOGY')))
  ) {
    return 'PCB';
  }
  
  // Check for EGM (Economics, Geography, Advanced Math)
  if (
    (subjectCodes.some(c => c.includes('ECO')) || subjectNames.some(n => n.includes('ECONOMICS'))) &&
    (subjectCodes.some(c => c.includes('GEO')) || subjectNames.some(n => n.includes('GEOGRAPHY'))) &&
    (subjectCodes.some(c => c.includes('ADV') || c.includes('MATH')) || subjectNames.some(n => n.includes('ADVANCED') || n.includes('MATH'))) &&
    !(subjectCodes.some(c => c.includes('BASIC')) || subjectNames.some(n => n.includes('BASIC'))) // Exclude Basic Math
  ) {
    return 'EGM';
  }
  
  // Check for HGE (History, Geography, Economics)
  if (
    (subjectCodes.some(c => c.includes('HIS')) || subjectNames.some(n => n.includes('HISTORY'))) &&
    !(subjectCodes.some(c => c.includes('TANZANIA')) || subjectNames.some(n => n.includes('TANZANIA'))) && // Exclude Tanzania History
    (subjectCodes.some(c => c.includes('GEO')) || subjectNames.some(n => n.includes('GEOGRAPHY'))) &&
    (subjectCodes.some(c => c.includes('ECO')) || subjectNames.some(n => n.includes('ECONOMICS')))
  ) {
    return 'HGE';
  }
  
  // Check for HGL (History, Geography, Literature/English)
  // HGL can use either English or Literature
  if (
    (subjectCodes.some(c => c.includes('HIS')) || subjectNames.some(n => n.includes('HISTORY'))) &&
    !(subjectCodes.some(c => c.includes('TANZANIA')) || subjectNames.some(n => n.includes('TANZANIA'))) && // Exclude Tanzania History
    (subjectCodes.some(c => c.includes('GEO')) || subjectNames.some(n => n.includes('GEOGRAPHY'))) &&
    (subjectCodes.some(c => c.includes('ENG') || c.includes('LIT')) || 
     subjectNames.some(n => n.includes('ENGLISH') || n.includes('LITERATURE')))
  ) {
    return 'HGL';
  }
  
  // Check for HKL (History, Kiswahili, Literature/English)
  // HKL can use either English or Literature
  if (
    (subjectCodes.some(c => c.includes('HIS')) || subjectNames.some(n => n.includes('HISTORY'))) &&
    !(subjectCodes.some(c => c.includes('TANZANIA')) || subjectNames.some(n => n.includes('TANZANIA'))) && // Exclude Tanzania History
    (subjectCodes.some(c => c.includes('KIS') || c.includes('SWA')) || 
     subjectNames.some(n => n.includes('KISWAHILI') || n.includes('SWAHILI'))) &&
    (subjectCodes.some(c => c.includes('ENG') || c.includes('LIT')) || 
     subjectNames.some(n => n.includes('ENGLISH') || n.includes('LITERATURE')))
  ) {
    return 'HKL';
  }
  
  return null;
}

/**
 * Check if subject matches combination code
 * @param {string} subjectCode - Subject code
 * @param {string} subjectName - Subject name
 * @param {string} comboCode - Combination code (PHY, CHE, etc.)
 * @returns {boolean} True if matches
 */
function matchesSubject(subjectCode, subjectName, comboCode) {
  const codeUpper = subjectCode.toUpperCase();
  const nameUpper = subjectName.toUpperCase();
  
  const patterns = {
    'PHY': ['PHY', 'PHYSICS', 'A/PHY', 'A_PHY'],
    'CHE': ['CHE', 'CHEMISTRY', 'A/CHE', 'A_CHE'],
    'BIO': ['BIO', 'BIOLOGY', 'A/BIO', 'A_BIO'],
    'ADV': ['ADV', 'ADVANCED', 'A/MATH', 'A_MATH', 'ADVANCED MATH'],
    'ECO': ['ECO', 'ECONOMICS', 'A/ECO', 'A_ECO'],
    'GEO': ['GEO', 'GEOGRAPHY', 'A/GEO', 'A_GEO'],
    'HIS': ['HIS', 'HISTORY', 'A/HIS', 'A_HIS'],
    'KIS': ['KIS', 'KISWAHILI', 'A/KIS', 'A_KIS', 'SWA', 'SWAHILI'],
    'ENG': ['ENG', 'ENGLISH', 'A/ENG', 'A_ENG', 'LIT', 'LITERATURE', 'A/LIT', 'A_LIT'] // HGL/HKL can use English or Literature
  };
  
  const patternsForCode = patterns[comboCode] || [];
  
  // Check code match
  for (const pattern of patternsForCode) {
    if (codeUpper.includes(pattern) || nameUpper.includes(pattern)) {
      // Exclude Basic Math for PCM/EGM (only Advanced Math)
      if ((comboCode === 'ADV') && (codeUpper.includes('BASIC') || nameUpper.includes('BASIC'))) {
        continue;
      }
      // Exclude Tanzania History for HGE/HGL (only general History)
      if ((comboCode === 'HIS') && (codeUpper.includes('TANZANIA') || nameUpper.includes('TANZANIA'))) {
        continue;
      }
      return true;
    }
  }
  
  return false;
}

/**
 * Get O-Level division from division point
 * @param {number} divisionPoint - Division point (7-35)
 * @returns {string} Division (I, II, III, IV, 0)
 */
function getOLevelDivision(divisionPoint) {
  if (divisionPoint >= 7 && divisionPoint <= 17) {
    return 'I';
  } else if (divisionPoint >= 18 && divisionPoint <= 20) {
    return 'II';
  } else if (divisionPoint >= 21 && divisionPoint <= 25) {
    return 'III';
  } else if (divisionPoint >= 26 && divisionPoint <= 33) {
    return 'IV';
  } else if (divisionPoint >= 34 && divisionPoint <= 35) {
    return '0';
  } else {
    return '0'; // Default for invalid points
  }
}

/**
 * Get A-Level division from division point
 * @param {number} divisionPoint - Division point (3-21)
 * @returns {string|null} Division (I, II, III, IV, 0) or null if invalid
 */
function getALevelDivision(divisionPoint) {
  if (divisionPoint === null || divisionPoint === undefined) {
    return null;
  }
  
  if (divisionPoint >= 3 && divisionPoint <= 9) {
    return 'I';
  } else if (divisionPoint >= 10 && divisionPoint <= 12) {
    return 'II';
  } else if (divisionPoint >= 13 && divisionPoint <= 17) {
    return 'III';
  } else if (divisionPoint >= 18 && divisionPoint <= 19) {
    return 'IV';
  } else if (divisionPoint >= 20 && divisionPoint <= 21) {
    return '0';
  } else {
    return '0'; // Default for invalid points
  }
}

/**
 * Calculate weighted total for a subject across months
 * @param {Object} scores - Object mapping month to score
 * @param {Array<string>} months - Array of month names
 * @param {Object} monthWeights - Object mapping month to weight percentage
 * @returns {number} Weighted total
 */
function calculateWeightedTotal(scores, months, monthWeights) {
  let total = 0;

  months.forEach((month) => {
    const rawScore = scores[month];
    // Skip NULL/not registered scores (dash or empty space)
    if (rawScore === null || rawScore === undefined || rawScore === '') {
      return;
    }
    const weight = (monthWeights[month] || 0) / 100;
    total += parseFloat(rawScore) * weight;
  });

  return total;
}

/**
 * Calculate overall average across all subjects
 * @param {Object} subjectsData - Object mapping subject_code to {weighted_total}
 * @returns {number} Overall average
 */
function calculateOverallAverage(subjectsData) {
  let totalMarks = 0;
  let validSubjects = 0;

  for (const subjectCode in subjectsData) {
    const subjectData = subjectsData[subjectCode];
    const weightedTotal = subjectData.weighted_total || 0;
    // Only count subjects with valid scores (weighted_total > 0)
    if (weightedTotal > 0) {
      totalMarks += weightedTotal;
      validSubjects++;
    }
  }

  return validSubjects > 0 ? totalMarks / validSubjects : 0;
}

module.exports = {
  calculateGrade,
  getSwahiliRemarks,
  calculateOLevelDivisionPoint,
  calculateALevelDivisionPoint,
  getOLevelDivision,
  getALevelDivision,
  calculateWeightedTotal,
  calculateOverallAverage,
  detectCombinationFromSubjects,
  matchesSubject
};

