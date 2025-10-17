/**
 * Maps a rating average to a descriptive word and color based on the scale
 * @param {number} average - The average rating value
 * @param {number} scaleMax - The maximum value of the scale (e.g., 5 or 10)
 * @returns {object} - { word, color, hexColor }
 */
const mapRatingToWord = (average, scaleMax = 5) => {
  if (!average || isNaN(average)) {
    return { word: 'N/A', color: 'gray', hexColor: '#9CA3AF' };
  }

  // Normalize the average to a 0-1 scale
  const normalized = average / scaleMax;

  // Define thresholds (same proportions for any scale)
  if (normalized < 0.36) {
    return { 
      word: 'Poor', 
      color: 'red', 
      hexColor: '#EF4444',
      bgColor: '#FEE2E2' // Light red background
    };
  } else if (normalized < 0.52) {
    return { 
      word: 'Below Average', 
      color: 'orange', 
      hexColor: '#F97316',
      bgColor: '#FFEDD5' // Light orange background
    };
  } else if (normalized < 0.68) {
    return { 
      word: 'Average', 
      color: 'yellow', 
      hexColor: '#EAB308',
      bgColor: '#FEF9C3' // Light yellow background
    };
  } else if (normalized < 0.84) {
    return { 
      word: 'Good', 
      color: 'green', 
      hexColor: '#22C55E',
      bgColor: '#DCFCE7' // Light green background
    };
  } else {
    return { 
      word: 'Very Good', 
      color: 'darkgreen', 
      hexColor: '#16A34A',
      bgColor: '#BBF7D0' // Light green background
    };
  }
};

/**
 * Formats a rating with its descriptive word
 * @param {number} average - The average rating value
 * @param {number} scaleMax - The maximum value of the scale
 * @returns {string} - Formatted string like "Good (4.2)"
 */
const formatRatingWithWord = (average, scaleMax = 5) => {
  if (!average || isNaN(average)) {
    return 'N/A';
  }
  
  const { word } = mapRatingToWord(average, scaleMax);
  return `${word} (${average.toFixed(2)})`;
};

module.exports = {
  mapRatingToWord,
  formatRatingWithWord
};
