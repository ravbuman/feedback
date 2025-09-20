import { adminAPI } from '../services/api';

// Check if phone number already exists
export const checkPhoneNumberExists = async (phoneNumber, excludeId = null) => {
  try {
    const response = await adminAPI.getFaculty();
    const faculty = response.data;
    
    // Check if phone number exists (excluding current faculty if editing)
    const existingFaculty = faculty.find(f => 
      f.phoneNumber === phoneNumber && f._id !== excludeId
    );
    
    return !!existingFaculty;
  } catch (error) {
    console.error('Error checking phone number:', error);
    return false; // Return false on error to allow submission
  }
};

// Validate phone number format
export const validatePhoneNumber = (phoneNumber) => {
  const phoneRegex = /^[0-9+\-\s()]+$/;
  return phoneRegex.test(phoneNumber);
};

// Validate email format
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Check if course code already exists
export const checkCourseCodeExists = async (courseCode, excludeId = null) => {
  try {
    const response = await adminAPI.getCourses();
    const courses = response.data;
    
    // Check if course code exists (excluding current course if editing)
    const existingCourse = courses.find(c => 
      c.courseCode === courseCode && c._id !== excludeId
    );
    
    return !!existingCourse;
  } catch (error) {
    console.error('Error checking course code:', error);
    return false; // Return false on error to allow submission
  }
};
