/**
 * Maps a rating average to a descriptive word and color based on the scale
 * @param {number} average - The average rating value
 * @param {number} scaleMax - The maximum value of the scale (e.g., 5 or 10)
 * @returns {object} - { word, color, bgColor, textColor }
 */
export const mapRatingToWord = (average, scaleMax = 5) => {
  if (!average || isNaN(average)) {
    return { 
      word: 'N/A', 
      color: 'gray', 
      bgColor: 'bg-gray-100', 
      textColor: 'text-gray-600',
      borderColor: 'border-gray-300'
    };
  }

  // Normalize the average to a 0-1 scale
  const normalized = average / scaleMax;

  // Define thresholds (same proportions for any scale)
  if (normalized < 0.36) {
    return { 
      word: 'Poor', 
      color: 'red',
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      borderColor: 'border-red-300'
    };
  } else if (normalized < 0.52) {
    return { 
      word: 'Below Average', 
      color: 'orange',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-700',
      borderColor: 'border-orange-300'
    };
  } else if (normalized < 0.68) {
    return { 
      word: 'Average', 
      color: 'yellow',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-700',
      borderColor: 'border-yellow-300'
    };
  } else if (normalized < 0.84) {
    return { 
      word: 'Good', 
      color: 'green',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      borderColor: 'border-green-300'
    };
  } else {
    return { 
      word: 'Very Good', 
      color: 'darkgreen',
      bgColor: 'bg-green-200',
      textColor: 'text-green-800',
      borderColor: 'border-green-400'
    };
  }
};

/**
 * Formats a rating with its descriptive word
 * @param {number} average - The average rating value
 * @param {number} scaleMax - The maximum value of the scale
 * @returns {string} - Formatted string like "Good (4.2)"
 */
export const formatRatingWithWord = (average, scaleMax = 5) => {
  if (!average || isNaN(average)) {
    return 'N/A';
  }
  
  const { word } = mapRatingToWord(average, scaleMax);
  return `${word} (${average.toFixed(2)})`;
};
