import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const ComparePeriodModal = ({ isOpen, onClose, activationPeriods, onCompare }) => {
  const [selectedPeriods, setSelectedPeriods] = useState([]);

  useEffect(() => {
    // Set default selections to last two periods if available
    if (activationPeriods.length >= 2) {
      const sortedPeriods = [...activationPeriods].sort((a, b) => new Date(b.start) - new Date(a.start));
      setSelectedPeriods([sortedPeriods[0].start, sortedPeriods[1].start]);
    }
  }, [activationPeriods]);

  const handlePeriodToggle = (periodStart) => {
    if (periodStart === 'all') {
      // If all is selected, select all periods
      setSelectedPeriods(selectedPeriods.length === activationPeriods.length ? 
        [] : activationPeriods.map(p => p.start));
      return;
    }

    setSelectedPeriods(prev => {
      if (prev.includes(periodStart)) {
        return prev.filter(p => p !== periodStart);
      }
      return [...prev, periodStart];
    });
  };

  const handleCompare = () => {
    if (selectedPeriods.length >= 2) {
      onCompare(selectedPeriods);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Compare Periods</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-gray-600 mb-4">Select two or more periods to compare</p>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            <label
              className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer font-semibold"
            >
              <input
                type="checkbox"
                checked={selectedPeriods.length === activationPeriods.length}
                onChange={() => handlePeriodToggle('all')}
                className="mr-3"
              />
              <span>Select All Periods</span>
            </label>

            <div className="border-t my-2"></div>

            {activationPeriods.map((period, index) => (
              <label
                key={period.start}
                className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedPeriods.includes(period.start)}
                  onChange={() => handlePeriodToggle(period.start)}
                  className="mr-3"
                />
                <span>
                  Period {index + 1}: {new Date(period.start).toLocaleDateString()} -
                  {period.end ? new Date(period.end).toLocaleDateString() : 'Active'}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCompare}
            disabled={selectedPeriods.length < 2}
            className={`px-4 py-2 rounded-md ${selectedPeriods.length >= 2
                ? 'bg-royal-600 text-white hover:bg-royal-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              } transition-colors`}
          >
            Compare {selectedPeriods.length} Periods
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComparePeriodModal;