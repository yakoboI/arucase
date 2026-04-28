/**
 * Comprehensive Student Marks Page
 * Shows all subjects for a student with embedded marks configuration
 * Matching Python Website Template: month_selection_student_marks.html
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { studentsAPI } from '../../services/students';
import api from '../../services/api';
import './ComprehensiveStudentMarks.css';

// Calculation functions (matching backend/utils/calculations.js)
const calculateOLevelDivisionPoint = (subjectsData) => {
  const gradeValueMap = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'F': 5 };
  const gradeValues = Object.values(subjectsData).map(s => {
    const grade = s.grade || 'F';
    return gradeValueMap[grade] || 5;
  });
  gradeValues.sort((a, b) => a - b);
  const sevenHighest = gradeValues.slice(0, 7);
  return sevenHighest.reduce((sum, val) => sum + val, 0);
};

// Helper function to check if subject matches combination code (matching backend logic)
const matchesSubject = (subjectCode, subjectName, comboCode) => {
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
    'ENG': ['ENG', 'ENGLISH', 'A/ENG', 'A_ENG', 'LIT', 'LITERATURE', 'A/LIT', 'A_LIT']
  };
  
  const patternsForCode = patterns[comboCode] || [];
  
  // Check code match
  for (const pattern of patternsForCode) {
    if (codeUpper.includes(pattern) || nameUpper.includes(pattern)) {
      // Exclude Basic Math for PCM/EGM (only Advanced Math)
      if ((comboCode === 'ADV') && (codeUpper.includes('BASIC') || nameUpper.includes('BASIC'))) {
        continue;
      }
      // Exclude Tanzania History for HGE/HGL/HKL (only general History)
      if ((comboCode === 'HIS') && (codeUpper.includes('TANZANIA') || nameUpper.includes('TANZANIA'))) {
        continue;
      }
      return true;
    }
  }
  
  return false;
};

const calculateALevelDivisionPoint = (subjectsData, stream) => {
  const gradeValueMap = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'S': 6, 'F': 7 };
  const combinations = {
    'PCM': ['PHY', 'CHE', 'ADV'],
    'PCB': ['PHY', 'CHE', 'BIO'],
    'EGM': ['ECO', 'GEO', 'ADV'],
    'HGE': ['HIS', 'GEO', 'ECO'],
    'HGL': ['HIS', 'GEO', 'ENG'], // History, Geography, Literature/English
    'HKL': ['HIS', 'KIS', 'ENG'],  // History, Kiswahili, Literature/English
    'PGM': ['PHY', 'GEO', 'ADV']   // Physics, Geography, Advanced Mathematics
  };
  
  const detectedStream = stream || detectCombinationFromSubjects(subjectsData);
  if (!detectedStream || !combinations[detectedStream]) return null;
  
  const combinationSubjects = combinations[detectedStream];
  const comboBestGrades = {};
  
  Object.entries(subjectsData).forEach(([subjectCode, subjectData]) => {
    const grade = subjectData.grade || 'F';
    const gradeValue = gradeValueMap[grade] || 7;
    const subjectName = (subjectData.name || '').toUpperCase();
    
    // Use robust matching function
    combinationSubjects.forEach(comboCode => {
      if (matchesSubject(subjectCode, subjectName, comboCode)) {
        // Keep best grade if multiple matches
        if (!comboBestGrades[comboCode] || gradeValue < comboBestGrades[comboCode]) {
          comboBestGrades[comboCode] = gradeValue;
        }
      }
    });
  });
  
  const gradeValues = Object.values(comboBestGrades);
  if (gradeValues.length !== 3) return null;
  
  gradeValues.sort((a, b) => a - b);
  return gradeValues.reduce((sum, val) => sum + val, 0);
};

const detectCombinationFromSubjects = (subjectsData) => {
  const codes = Object.keys(subjectsData).map(c => c.toUpperCase());
  const names = Object.values(subjectsData).map(s => (s.name || '').toUpperCase());
  
  // Helper to check if subject exists (excluding specific variations)
  const hasSubject = (patterns, excludePatterns = []) => {
    const hasMatch = patterns.some(pattern => 
      codes.some(c => c.includes(pattern)) || names.some(n => n.includes(pattern))
    );
    if (!hasMatch) return false;
    
    // Check exclusions
    if (excludePatterns.length > 0) {
      const hasExclusion = excludePatterns.some(pattern =>
        codes.some(c => c.includes(pattern)) || names.some(n => n.includes(pattern))
      );
      if (hasExclusion) return false;
    }
    return true;
  };
  
  // Check for PCM (Physics, Chemistry, Advanced Math)
  if (hasSubject(['PHY', 'PHYSICS']) &&
      hasSubject(['CHE', 'CHEMISTRY']) &&
      hasSubject(['ADV', 'ADVANCED', 'A/MATH', 'A_MATH'], ['BASIC'])) {
    return 'PCM';
  }
  
  // Check for PCB (Physics, Chemistry, Biology)
  if (hasSubject(['PHY', 'PHYSICS']) &&
      hasSubject(['CHE', 'CHEMISTRY']) &&
      hasSubject(['BIO', 'BIOLOGY'])) {
    return 'PCB';
  }
  
  // Check for EGM (Economics, Geography, Advanced Math)
  if (hasSubject(['ECO', 'ECONOMICS']) &&
      hasSubject(['GEO', 'GEOGRAPHY']) &&
      hasSubject(['ADV', 'ADVANCED', 'A/MATH', 'A_MATH'], ['BASIC'])) {
    return 'EGM';
  }
  
  // Check for HGE (History, Geography, Economics)
  if (hasSubject(['HIS', 'HISTORY'], ['TANZANIA']) &&
      hasSubject(['GEO', 'GEOGRAPHY']) &&
      hasSubject(['ECO', 'ECONOMICS'])) {
    return 'HGE';
  }
  
  // Check for HGL (History, Geography, Literature/English)
  // HGL can use either English or Literature
  if (hasSubject(['HIS', 'HISTORY'], ['TANZANIA']) &&
      hasSubject(['GEO', 'GEOGRAPHY']) &&
      (hasSubject(['ENG', 'ENGLISH', 'LIT', 'LITERATURE', 'A/ENG', 'A_LIT', 'A/LIT']))) {
    return 'HGL';
  }
  
  // Check for HKL (History, Kiswahili, Literature/English)
  // HKL can use either English or Literature
  if (hasSubject(['HIS', 'HISTORY'], ['TANZANIA']) &&
      hasSubject(['KIS', 'KISWAHILI', 'SWA', 'SWAHILI']) &&
      (hasSubject(['ENG', 'ENGLISH', 'LIT', 'LITERATURE', 'A/ENG', 'A_LIT', 'A/LIT']))) {
    return 'HKL';
  }
  
  // Check for PGM (Physics, Geography, Advanced Mathematics)
  if (hasSubject(['PHY', 'PHYSICS']) &&
      hasSubject(['GEO', 'GEOGRAPHY']) &&
      hasSubject(['ADV', 'ADVANCED', 'A/MATH', 'A_MATH'], ['BASIC'])) {
    return 'PGM';
  }
  
  return null;
};

const getOLevelDivision = (divisionPoint) => {
  if (divisionPoint >= 7 && divisionPoint <= 17) return 'I';
  if (divisionPoint >= 18 && divisionPoint <= 20) return 'II';
  if (divisionPoint >= 21 && divisionPoint <= 25) return 'III';
  if (divisionPoint >= 26 && divisionPoint <= 33) return 'IV';
  return '0';
};

const getALevelDivision = (divisionPoint) => {
  if (divisionPoint === null || divisionPoint === undefined) return null;
  if (divisionPoint >= 3 && divisionPoint <= 9) return 'I';
  if (divisionPoint >= 10 && divisionPoint <= 12) return 'II';
  if (divisionPoint >= 13 && divisionPoint <= 17) return 'III';
  if (divisionPoint >= 18 && divisionPoint <= 19) return 'IV';
  return '0';
};

const ComprehensiveStudentMarks = ({ formLevel }) => {
  const { year, stream, term, admNo } = useParams();
  const queryClient = useQueryClient();
  
  const [weights, setWeights] = useState({});
  const [total, setTotal] = useState(0);
  const [weightedTotals, setWeightedTotals] = useState({});
  const [divisionPoint, setDivisionPoint] = useState(null);
  const [division, setDivision] = useState(null);
  const [overallRank, setOverallRank] = useState(null);
  const [totalStudents, setTotalStudents] = useState(0);
  const [subjectRankings, setSubjectRankings] = useState({});
  const prevDepsRef = useRef({ subjects: '', weights: '', scoresData: '' });

  // Normalize form level to uppercase (e.g., "form-i" -> "FORM I")
  const normalizedLevel = formLevel
    ? formLevel.split('-').map(w => w.toUpperCase()).join(' ')
    : '';
  
  // Normalize stream: use 'A' as default for Form I-IV (previously 'NA')
  // For Form V/VI, use the actual stream value (e.g., "HKL", "PCM", etc.)
  const isFormVOrVI = normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI';
  const normalizedStream = stream || (isFormVOrVI ? '' : 'A');

  // Debug logging
  useEffect(() => {
    console.log('ComprehensiveStudentMarks params:', {
      formLevel,
      normalizedLevel,
      normalizedStream,
      year,
      stream,
      term,
      admNo,
      isFormVOrVI
    });
  }, [formLevel, normalizedLevel, normalizedStream, year, stream, term, admNo, isFormVOrVI]);

  // Get months for term - memoize to prevent infinite loops
  // Form V/VI: Academic year July-June. Term I (Jul-Dec): Aug-Nov, Term II (Jan-Jun): Feb-May
  // Form I-IV: Term I: Feb-May, Term II: Aug-Nov
  const getMonthsForTerm = React.useCallback((termParam, formCode) => {
    const isForm5Or6 = formCode && (formCode.includes('FORM V') || formCode.includes('FORM VI'));

    if (termParam === 'Term I' || termParam === 'Term 1') {
      return isForm5Or6 ? ['August', 'September', 'October', 'November'] : ['February', 'March', 'April', 'May'];
    } else {
      return isForm5Or6 ? ['February', 'March', 'April', 'May'] : ['August', 'September', 'October', 'November'];
    }
  }, []);

  const months = React.useMemo(() => getMonthsForTerm(term, normalizedLevel), [term, normalizedLevel, getMonthsForTerm]);

  // Helper function: update total
  const updateTotal = React.useCallback((newWeights) => {
    const sum = Object.values(newWeights).reduce((acc, val) => {
      const numVal = parseFloat(val);
      return acc + (isNaN(numVal) ? 0 : numVal);
    }, 0);
    setTotal(sum);
  }, []);

  // Helper function: get grade remarks
  const getGradeRemarks = React.useCallback((grade, isForm5Or6) => {
    if (isForm5Or6) {
      const remarks = {
        'A': 'Bora Sana', 'B': 'Vizuri Sana', 'C': 'Vizuri',
        'D': 'Dhaifu', 'E': 'Wastani', 'S': 'Kidogo', 'F': 'Feli'
      };
      return remarks[grade] || '-';
    } else {
      const remarks = {
        'A': 'Bora Sana', 'B': 'Vizuri Sana', 'C': 'Vizuri',
        'D': 'Dhaifu', 'F': 'Feli'
      };
      return remarks[grade] || '-';
    }
  }, []);

  // Fetch student data
  const { data: studentData, isLoading: studentLoading } = useQuery({
    queryKey: ['student', normalizedLevel, normalizedStream, year, admNo],
    queryFn: async () => {
      const res = await studentsAPI.getStudents({
        level: normalizedLevel,
        stream: normalizedStream,
        year: year,
      });
      const students = res.data.students || [];
      return students.find(s => s.adm_no === admNo);
    },
  });

  // Fetch subjects - must be declared before calculateWeightedTotals
  const { data: subjects = [], isLoading: subjectsLoading, error: subjectsError } = useQuery({
    queryKey: ['subjects', normalizedLevel, normalizedStream, year],
    queryFn: async () => {
      try {
        const res = await studentsAPI.getSubjects({
          level: normalizedLevel,
          stream: normalizedStream,
          year: year,
        });
        return res.data.subjects || [];
      } catch (error) {
        console.error('Error fetching subjects:', error);
        throw error;
      }
    },
    enabled: !!normalizedLevel && !!normalizedStream && !!year,
  });

  // Fetch scores for this student - use getScores API for the specific student
  // Must be declared before calculateWeightedTotals
  const { data: scoresData = {}, isLoading: scoresLoading } = useQuery({
    queryKey: ['scores', normalizedLevel, normalizedStream, year, admNo, months.join(','), subjects.length],
    queryFn: async () => {
      // Fetch all scores for this student with level, stream, and year filters
      const res = await studentsAPI.getScores(admNo, {
        level: normalizedLevel,
        stream: normalizedStream,
        year: year,
      });
      
      // Get fresh subjects data from query cache
      const subjectsData = queryClient.getQueryData(['subjects', normalizedLevel, normalizedStream, year]) || subjects;
      
      // Create mapping: numeric code -> abbreviation, and abbreviation -> abbreviation
      // This maps scores stored with numeric codes to their display abbreviations
      const subjectCodeMap = {};
      subjectsData.forEach(subject => {
        if (subject.subject_code) {
          subjectCodeMap[subject.subject_code] = subject.subject_abbreviation || subject.subject_code;
        }
        if (subject.subject_abbreviation) {
          subjectCodeMap[subject.subject_abbreviation] = subject.subject_abbreviation;
        }
      });
      
      // Organize scores by subject abbreviation (preferred) and month
      // Map both numeric codes and abbreviations to the same abbreviation key
      const scores = {};
      (res.data.scores || []).forEach(score => {
        // Get the subject code from the score (could be numeric or abbreviation)
        const scoreSubjectCode = score.subject_code;
        // Map it to the abbreviation (or use as-is if already abbreviation)
        const mappedCode = subjectCodeMap[scoreSubjectCode] || scoreSubjectCode;
        
        // Use abbreviation as the key (preferred for display)
        const displayCode = mappedCode;
        if (!scores[displayCode]) {
          scores[displayCode] = {};
        }
        scores[displayCode][score.month] = score.score; // Keep NULL for not registered
      });
      return scores;
    },
    enabled: subjects.length > 0, // Wait for subjects to be loaded first
  });

  // Fetch marks configuration
  const { data: marksConfig, isLoading: configLoading } = useQuery({
    queryKey: ['marks-config', term],
    queryFn: async () => {
      const res = await studentsAPI.getMarksConfig();
      return res.data.month_weights || {};
    },
  });

  // Fetch all students in class for ranking and total count
  const { data: allStudents = [], isLoading: allStudentsLoading } = useQuery({
    queryKey: ['all-students', normalizedLevel, normalizedStream, year],
    queryFn: async () => {
      const res = await studentsAPI.getStudents({
        level: normalizedLevel,
        stream: normalizedStream,
        year: year,
      });
      return res.data.students || [];
    },
  });

  // Fetch all scores for ranking calculation
  const { data: allScoresData = {}, isLoading: allScoresLoading } = useQuery({
    queryKey: ['all-scores', normalizedLevel, normalizedStream, year, months.join(','), allStudents.length],
    queryFn: async () => {
      if (allStudents.length === 0) return {};
      
      // Fetch scores for all students
      const scoresPromises = allStudents.map(student => 
        studentsAPI.getScores(student.adm_no, {
          level: normalizedLevel,
          stream: normalizedStream,
          year: year,
        }).catch(() => ({ data: { scores: [] } }))
      );
      const scoresResults = await Promise.all(scoresPromises);
      
      // Get subjects for mapping
      const subjectsRes = await studentsAPI.getSubjects({
        level: normalizedLevel,
        stream: normalizedStream,
        year: year,
      });
      const subjectsList = subjectsRes.data.subjects || [];
      
      // Create subject code mapping
      const subjectCodeMap = {};
      subjectsList.forEach(subject => {
        if (subject.subject_code) {
          subjectCodeMap[subject.subject_code] = subject.subject_abbreviation || subject.subject_code;
        }
        if (subject.subject_abbreviation) {
          subjectCodeMap[subject.subject_abbreviation] = subject.subject_abbreviation;
        }
      });
      
      // Organize all scores by student
      const allScores = {};
      scoresResults.forEach((res, index) => {
        const student = allStudents[index];
        if (student) {
          allScores[student.adm_no] = {};
          (res.data.scores || []).forEach(score => {
            const scoreSubjectCode = score.subject_code;
            const mappedCode = subjectCodeMap[scoreSubjectCode] || scoreSubjectCode;
            
            if (!allScores[student.adm_no][mappedCode]) {
              allScores[student.adm_no][mappedCode] = {};
            }
            allScores[student.adm_no][mappedCode][score.month] = score.score; // Keep NULL for not registered
          });
        }
      });
      return allScores;
    },
    enabled: allStudents.length > 0 && subjects.length > 0,
  });

  // Calculate subject rankings and overall ranking
  useEffect(() => {
    if (allStudents.length === 0 || subjects.length === 0 || Object.keys(weights).length === 0 || allScoresLoading) {
      return;
    }
    
    // Ensure we have scores data (even if empty, the structure should exist)
    if (!allScoresData || typeof allScoresData !== 'object') {
      return;
    }
    
    setTotalStudents(allStudents.length);
    
    // Calculate subject rankings
    const rankings = {};
    subjects.forEach(subject => {
      const subjectCode = subject.subject_abbreviation || subject.subject_code;
      const subjectTotals = {};
      
      // Calculate weighted total for each student in this subject
      allStudents.forEach(student => {
        const studentScores = allScoresData[student.adm_no] || {};
        const subjectScores = studentScores[subjectCode] || {};
        let subjectTotal = 0;
        let validMonths = 0;

        months.forEach(month => {
          const rawScore = subjectScores[month];
          // Skip NULL/not registered scores (dash or empty space)
          if (rawScore === null || rawScore === undefined || rawScore === '' || rawScore === '-') {
            return;
          }
          const score = parseFloat(rawScore);
          const weight = (weights[month] || 0) / 100;
          subjectTotal += score * weight;
          validMonths++;
        });

        // Use average per valid month instead of total for fair comparison
        subjectTotals[student.adm_no] = validMonths > 0 ? subjectTotal / validMonths : 0;
      });
      
      // Sort and rank students for this subject
      const sorted = Object.entries(subjectTotals)
        .sort((a, b) => b[1] - a[1])
        .map((entry, index) => ({ adm_no: entry[0], rank: index + 1 }));
      
      rankings[subjectCode] = {};
      sorted.forEach((item) => {
        rankings[subjectCode][item.adm_no] = item.rank;
      });
    });
    
    setSubjectRankings(rankings);
    
    // Calculate overall totals for all students
    const studentTotals = {};
    allStudents.forEach(student => {
      let grandTotal = 0;
      let validSubjects = 0;
      const studentScores = allScoresData[student.adm_no] || {};

      subjects.forEach(subject => {
        const subjectCode = subject.subject_abbreviation || subject.subject_code;
        const subjectScores = studentScores[subjectCode] || {};
        let subjectTotal = 0;
        let validMonths = 0;

        months.forEach(month => {
          const rawScore = subjectScores[month];
          // Skip NULL/not registered scores (dash or empty space)
          if (rawScore === null || rawScore === undefined || rawScore === '' || rawScore === '-') {
            return;
          }
          const score = parseFloat(rawScore);
          const weight = (weights[month] || 0) / 100;
          subjectTotal += score * weight;
          validMonths++;
        });

        // Only count subjects with valid scores
        if (validMonths > 0) {
          grandTotal += subjectTotal / validMonths;
          validSubjects++;
        }
      });

      // Use average per subject instead of grand total for fair comparison
      studentTotals[student.adm_no] = validSubjects > 0 ? grandTotal / validSubjects : 0;
    });
    
    // Sort and rank for overall position
    const sorted = Object.entries(studentTotals)
      .sort((a, b) => b[1] - a[1])
      .map((entry, index) => ({ adm_no: entry[0], rank: index + 1 }));
    
    const rank = sorted.find(item => item.adm_no === admNo)?.rank || null;
    setOverallRank(rank);
  }, [allStudents, subjects, allScoresData, weights, months, admNo, allScoresLoading]);

  // Initialize weights from config
  useEffect(() => {
    if (marksConfig && Object.keys(marksConfig).length > 0) {
      const initialWeights = {};
      months.forEach(month => {
        initialWeights[month] = marksConfig[month] !== undefined ? marksConfig[month] : (month === months[0] ? 100.0 : 0.0);
      });
      setWeights(initialWeights);
      updateTotal(initialWeights);
    } else if (!configLoading) {
      // Default: first month = 100%, others = 0%
      const defaultWeights = {};
      months.forEach((month, idx) => {
        defaultWeights[month] = idx === 0 ? 100.0 : 0.0;
      });
      setWeights(defaultWeights);
      updateTotal(defaultWeights);
    }
  }, [marksConfig, term, configLoading, months, updateTotal]);

  // Calculate weighted totals when weights or scores change
  // Use useEffect with ref-based change detection to avoid infinite loops
  useEffect(() => {
    if (subjects.length === 0 || Object.keys(weights).length === 0) {
      return;
    }
    
    // Create stable keys for comparison
    const subjectsKey = JSON.stringify(subjects.map(s => ({ code: s.subject_abbreviation || s.subject_code, id: s.id })));
    const weightsKey = JSON.stringify(weights);
    const scoresDataKey = JSON.stringify(scoresData);
    const monthsKey = months.join(',');
    
    // Check if dependencies actually changed
    const prevDeps = prevDepsRef.current;
    if (
      prevDeps.subjects === subjectsKey &&
      prevDeps.weights === weightsKey &&
      prevDeps.scoresData === scoresDataKey &&
      prevDeps.months === monthsKey &&
      prevDeps.normalizedLevel === normalizedLevel
    ) {
      return; // No change, skip computation
    }
    
    // Update ref with current values
    prevDepsRef.current = {
      subjects: subjectsKey,
      weights: weightsKey,
      scoresData: scoresDataKey,
      months: monthsKey,
      normalizedLevel: normalizedLevel
    };
    
    // Compute weighted totals
    const totals = {};
    const isForm5Or6 = normalizedLevel.includes('FORM V') || normalizedLevel.includes('FORM VI');

    subjects.forEach(subject => {
      const subjectCode = subject.subject_abbreviation || subject.subject_code;
      const subjectScores = scoresData[subjectCode] || {};

      let weightedTotal = 0;
      months.forEach(month => {
        const rawScore = subjectScores[month];
        // Skip NULL/not registered scores (dash or empty space)
        if (rawScore === null || rawScore === undefined || rawScore === '' || rawScore === '-') {
          return;
        }
        const score = parseFloat(rawScore);
        const weight = (weights[month] || 0) / 100;
        weightedTotal += score * weight;
      });

      // Calculate grade
      let grade = 'F';
      if (isForm5Or6) {
        if (weightedTotal >= 85) grade = 'A';
        else if (weightedTotal >= 75) grade = 'B';
        else if (weightedTotal >= 65) grade = 'C';
        else if (weightedTotal >= 55) grade = 'D';
        else if (weightedTotal >= 45) grade = 'E';
        else if (weightedTotal >= 40) grade = 'S';
      } else {
        if (weightedTotal >= 85) grade = 'A';
        else if (weightedTotal >= 70) grade = 'B';
        else if (weightedTotal >= 50) grade = 'C';
        else if (weightedTotal >= 40) grade = 'D';
      }

      totals[subjectCode] = {
        weightedTotal: weightedTotal,
        grade: grade,
        remarks: getGradeRemarks(grade, isForm5Or6)
      };
    });

    setWeightedTotals(totals);
  }, [subjects, weights, scoresData, months, normalizedLevel, getGradeRemarks]);

  // Calculate division point and division when weightedTotals change
  useEffect(() => {
    if (subjects.length === 0 || Object.keys(weightedTotals).length === 0) {
      return;
    }
    
    const isForm5Or6 = normalizedLevel.includes('FORM V') || normalizedLevel.includes('FORM VI');
    const subjectsDataForDivision = {};
    subjects.forEach(subject => {
      const subjectCode = subject.subject_abbreviation || subject.subject_code;
      const totals = weightedTotals[subjectCode] || { weightedTotal: 0, grade: 'F' };
      subjectsDataForDivision[subjectCode] = {
        grade: totals.grade,
        weighted_total: totals.weightedTotal,
        name: subject.subject_name || subjectCode
      };
    });
    
    let divPoint = null;
    let div = null;
    if (isForm5Or6) {
      divPoint = calculateALevelDivisionPoint(subjectsDataForDivision, normalizedStream);
      div = getALevelDivision(divPoint);
    } else {
      divPoint = calculateOLevelDivisionPoint(subjectsDataForDivision);
      div = getOLevelDivision(divPoint);
    }
    setDivisionPoint(divPoint);
    setDivision(div);
  }, [subjects, weightedTotals, normalizedLevel, normalizedStream]);

  const handleWeightChange = (month, value) => {
    const numValue = parseFloat(value) || 0;
    const validatedValue = Math.max(0, Math.min(100, numValue));
    const newWeights = { ...weights, [month]: validatedValue };
    setWeights(newWeights);
    updateTotal(newWeights);
  };

  // Save marks config mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      return studentsAPI.saveMarksConfig({ month_weights: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['marks-config']);
      toast.success('Marks configuration saved successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save marks configuration');
    },
  });

  const handleSaveConfig = (e) => {
    e.preventDefault();
    
    if (Math.abs(total - 100) > 0.01) {
      toast.error(`Total weights must equal 100%. Current total: ${total.toFixed(2)}%`);
      return;
    }

    saveMutation.mutate(weights);
  };

  const getBackPath = () => {
    // Return to student selection page
    // Ensure term is properly encoded for URL (handles spaces like "Term I")
    const encodedTerm = term ? encodeURIComponent(term) : term;
    
    if (normalizedLevel === 'FORM V' || normalizedLevel === 'FORM VI') {
      return `/admin/marks-config/${formLevel}/stream/${stream}/year/${year}/term/${encodedTerm}`;
    } else {
      return `/admin/marks-config/${formLevel}/year/${year}/stream/${stream}/term/${encodedTerm}`;
    }
  };

  const isLoading = studentLoading || subjectsLoading || scoresLoading || configLoading;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i> Loading student marks...
        </div>
      </AdminLayout>
    );
  }

  if (!studentData) {
    return (
      <AdminLayout>
        <div className="error-state">
          <i className="fas fa-exclamation-triangle"></i>
          <h3>Student not found</h3>
          <p>Could not find student with admission number: {admNo}</p>
          <p style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>
            Search criteria: Level={normalizedLevel}, Stream={normalizedStream}, Year={year}
          </p>
          <Link to={getBackPath()} className="excel-btn secondary" style={{ marginTop: '16px' }}>
            <i className="fas fa-arrow-left"></i> Back to Students
          </Link>
        </div>
      </AdminLayout>
    );
  }

  if (subjectsError) {
    return (
      <AdminLayout>
        <div className="error-state">
          <i className="fas fa-exclamation-triangle"></i>
          <h3>Error Loading Subjects</h3>
          <p>{subjectsError.message || 'Failed to load subjects. Please try again.'}</p>
          <p style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>
            Level={normalizedLevel}, Stream={normalizedStream}, Year={year}
          </p>
          <Link to={getBackPath()} className="excel-btn secondary" style={{ marginTop: '16px' }}>
            <i className="fas fa-arrow-left"></i> Back to Students
          </Link>
        </div>
      </AdminLayout>
    );
  }

  if (subjects.length === 0) {
    return (
      <AdminLayout>
        <div className="error-state">
          <i className="fas fa-exclamation-triangle"></i>
          <h3>No Subjects Found</h3>
          <p>No subjects have been registered for {normalizedLevel} {normalizedStream && normalizedStream !== 'A' ? `Stream ${normalizedStream}` : ''} {year}.</p>
          <p style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>
            Please register subjects before entering marks.
          </p>
          <Link to={getBackPath()} className="excel-btn secondary" style={{ marginTop: '16px' }}>
            <i className="fas fa-arrow-left"></i> Back to Students
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const studentName = `${studentData.first_name || ''} ${studentData.middle_name || ''} ${studentData.surname || ''}`.trim();

  return (
    <AdminLayout>
      <div className="comprehensive-student-marks-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-graduation-cap"></i>
            {studentName} ({admNo})
            <div className="header-actions">
              <Link to={getBackPath()} className="excel-btn small secondary">
                <i className="fas fa-arrow-left"></i> Back to Students
              </Link>
            </div>
          </div>
          <div className="excel-card-body">
            <div className="student-header">
              <div className="student-details">
                <h3>{studentName}</h3>
                <p>Admission Number: {admNo}</p>
                <p>Class: {normalizedLevel} {normalizedStream && normalizedStream !== 'A' ? `Stream ${normalizedStream}` : ''} {year}</p>
                <p>Term: {term}</p>
              </div>
            </div>

            {/* Configuration Section */}
            <div className="config-section">
              <h4><i className="fas fa-cog"></i> Configuration</h4>
              <p>Edit the percentage weights for each month. Total should equal 100%.</p>
              <div className="weight-summary">
                <span>Total Weight: <strong className={Math.abs(total - 100) < 0.01 ? 'valid' : 'invalid'}>{total.toFixed(2)}%</strong></span>
                <span className={`config-status ${Math.abs(total - 100) < 0.01 ? 'saved' : 'changed'}`}>
                  {Math.abs(total - 100) < 0.01 ? '✓ Saved' : '• Changes pending'}
                </span>
              </div>
            </div>

            {/* Main Marks Table with Embedded Configuration */}
            <div className="table-container">
              <table className="excel-table comprehensive-marks-table">
                <thead>
                  <tr>
                    <th rowSpan="2">S/N</th>
                    <th rowSpan="2">SUBJECT NAME</th>
                    <th rowSpan="2">SUBJECT CODE</th>
                    {months.map((month) => (
                      <th key={month} colSpan="2">{month.toUpperCase()}</th>
                    ))}
                    <th rowSpan="2">SUBJECT<br/>WEIGHTED<br/>TOTAL</th>
                    <th rowSpan="2">SUBJECT<br/>STUDENT<br/>RANK</th>
                    <th rowSpan="2">GRADE OF<br/>SUBJECT<br/>WEIGHTED TOTAL</th>
                    <th rowSpan="2">GRADE<br/>REMARKS</th>
                  </tr>
                  <tr>
                    {months.map((month) => (
                      <React.Fragment key={month}>
                        <th>RAW SCORE</th>
                        <th className="weight-header">
                          <div className="weight-input-wrapper">
                            <input
                              type="number"
                              id={`${month.toLowerCase()}_weight`}
                              className={`weight-input-header ${weights[month] > 0 ? 'has-value' : ''}`}
                              value={weights[month] !== undefined ? weights[month] : ''}
                              onChange={(e) => handleWeightChange(month, e.target.value)}
                              onBlur={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                handleWeightChange(month, value);
                              }}
                              min="0"
                              max="100"
                              step="0.0001"
                              placeholder="0.0000"
                              required
                            />
                            <span className="weight-percent-header">%</span>
                          </div>
                        </th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subject, index) => {
                    const subjectCode = subject.subject_abbreviation || subject.subject_code;
                    const subjectScores = scoresData[subjectCode] || {};
                    const totals = weightedTotals[subjectCode] || { weightedTotal: 0, grade: '-', remarks: '-' };

                    return (
                      <tr key={subject.id || subjectCode} className="subject-row">
                        <td className="sn-cell">{index + 1}</td>
                        <td className="subject-name-cell">
                          <strong>{subject.subject_name}</strong>
                        </td>
                        <td className="subject-code-cell">{subjectCode}</td>
                        {months.map((month) => {
                          const rawScore = subjectScores[month];
                          const isNotRegistered = rawScore === null || rawScore === undefined || rawScore === '' || rawScore === '-';
                          const scoreValue = isNotRegistered ? null : parseFloat(rawScore);
                          const weight = (weights[month] || 0) / 100;
                          const weightedScore = isNotRegistered ? 0 : scoreValue * weight;

                          return (
                            <React.Fragment key={month}>
                              <td className="raw-score-cell">
                                <input
                                  type="text"
                                  className="raw-score-input"
                                  value={isNotRegistered ? '-' : (scoreValue !== null ? scoreValue : '')}
                                  readOnly
                                  placeholder="0"
                                />
                              </td>
                              <td className="weighted-score-cell">
                                <span className="weighted-display">{weightedScore.toFixed(4)}</span>
                              </td>
                            </React.Fragment>
                          );
                        })}
                        <td className="weighted-total-cell">
                          <span className="weighted-total-display">{totals.weightedTotal.toFixed(4)}</span>
                        </td>
                        <td className="rank-cell">
                          <span className="rank-display">
                            {subjectRankings[subjectCode]?.[admNo] || '-'}
                          </span>
                        </td>
                        <td className="grade-cell">
                          <span className="grade-display">{totals.grade}</span>
                        </td>
                        <td className="remarks-cell">
                          <span className="remarks-display">{totals.remarks}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="summary-row">
                    <td colSpan={3 + months.length * 2} className="summary-label">
                      SUM OF ALL SUBJECT WEIGHTED TOTALS
                    </td>
                    <td className="summary-value">
                      {Object.values(weightedTotals).reduce((sum, t) => sum + (t.weightedTotal || 0), 0).toFixed(4)}
                    </td>
                    <td className="summary-label">
                      AVERAGE OF THE SUM OF ALL WEIGHTED TOTALS
                    </td>
                    <td className="summary-value">
                      {subjects.length > 0 
                        ? (Object.values(weightedTotals).reduce((sum, t) => sum + (t.weightedTotal || 0), 0) / subjects.length).toFixed(4)
                        : '0.0000'}
                    </td>
                    <td colSpan={2} className="summary-label"></td>
                  </tr>
                  <tr className="summary-row">
                    <td colSpan={3 + months.length * 2} className="summary-label">
                      GRADE OF THE AVERAGE OF THE SUM OF WEIGHTED TOTALS
                    </td>
                    <td className="summary-value">
                      {subjects.length > 0 
                        ? (() => {
                            const avg = Object.values(weightedTotals).reduce((sum, t) => sum + (t.weightedTotal || 0), 0) / subjects.length;
                            const isForm5Or6 = normalizedLevel.includes('FORM V') || normalizedLevel.includes('FORM VI');
                            if (isForm5Or6) {
                              if (avg >= 85) return 'A';
                              if (avg >= 75) return 'B';
                              if (avg >= 65) return 'C';
                              if (avg >= 55) return 'D';
                              if (avg >= 45) return 'E';
                              if (avg >= 40) return 'S';
                              return 'F';
                            } else {
                              if (avg >= 85) return 'A';
                              if (avg >= 70) return 'B';
                              if (avg >= 50) return 'C';
                              if (avg >= 40) return 'D';
                              return 'F';
                            }
                          })()
                        : '-'}
                    </td>
                    <td className="summary-label">DIVISION</td>
                    <td className="summary-value">{division !== null ? division : '-'}</td>
                    <td colSpan={2} className="summary-label"></td>
                  </tr>
                  <tr className="summary-row">
                    <td colSpan={3 + months.length * 2} className="summary-label">
                      DIVISION POINT
                    </td>
                    <td className="summary-value">{divisionPoint !== null ? divisionPoint.toString() : '-'}</td>
                    <td className="summary-label">STUDENT OVERALL POSITION</td>
                    <td className="summary-value">{overallRank !== null ? overallRank.toString() : '-'}</td>
                    <td colSpan={2} className="summary-label"></td>
                  </tr>
                  <tr className="summary-row">
                    <td colSpan={3 + months.length * 2} className="summary-label">
                      TOTAL STUDENTS IN A CLASS
                    </td>
                    <td className="summary-value">{totalStudents > 0 ? totalStudents.toString() : '-'}</td>
                    <td colSpan={4} className="summary-label"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Error Message */}
            {Math.abs(total - 100) > 0.01 && (
              <div className="error-message">
                <i className="fas fa-exclamation-triangle"></i> Total must equal 100%. Current total: {total.toFixed(2)}%
              </div>
            )}

            {/* Save Configuration Button - Separate from marks form */}
            <div className="config-form-section">
              <form onSubmit={handleSaveConfig} id="config-form">
                <input type="hidden" name="form_code" value={normalizedLevel} />
                <input type="hidden" name="stream" value={normalizedStream} />
                <input type="hidden" name="year" value={year} />
                <input type="hidden" name="term" value={term} />
                <input type="hidden" name="adm_no" value={admNo} />
                <button
                  type="submit"
                  className="excel-btn primary"
                  disabled={saveMutation.isLoading || Math.abs(total - 100) > 0.01}
                >
                  <i className="fas fa-save"></i> {saveMutation.isLoading ? 'Saving...' : 'Save Configuration'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ComprehensiveStudentMarks;
