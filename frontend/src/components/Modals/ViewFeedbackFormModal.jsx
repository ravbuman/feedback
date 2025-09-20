import { X, FileText, BarChart3, CheckCircle, XCircle, Star, Hash } from 'lucide-react';

const ViewFeedbackFormModal = ({ isOpen, onClose, form }) => {
  if (!isOpen || !form) return null;

  const getQuestionIcon = (questionType) => {
    switch (questionType) {
      case 'text':
        return <Hash className="h-4 w-4 text-blue-500" />;
      case 'textarea':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'scale':
        return <Star className="h-4 w-4 text-yellow-500" />;
      case 'yesno':
        return <CheckCircle className="h-4 w-4 text-purple-500" />;
      case 'multiplechoice':
        return <BarChart3 className="h-4 w-4 text-orange-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getQuestionTypeLabel = (questionType) => {
    switch (questionType) {
      case 'text':
        return 'Short Text';
      case 'textarea':
        return 'Long Text';
      case 'scale':
        return 'Rating Scale';
      case 'yesno':
        return 'Yes/No';
      case 'multiplechoice':
        return 'Multiple Choice';
      default:
        return questionType;
    }
  };

  const renderQuestionPreview = (question, index) => {
    const { questionText, questionType, options, isRequired, scaleMin, scaleMax } = question;

    return (
      <div key={index} className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            {getQuestionIcon(questionType)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <h4 className="text-sm font-medium text-gray-900">
                {questionText}
              </h4>
              {isRequired && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                  Required
                </span>
              )}
            </div>
            
            <div className="text-xs text-gray-500 mb-3">
              {getQuestionTypeLabel(questionType)}
            </div>

            {/* Question Preview */}
            <div className="space-y-2">
              {questionType === 'text' && (
                <input
                  type="text"
                  disabled
                  className="input text-sm bg-white"
                  placeholder="Short text answer will appear here"
                />
              )}

              {questionType === 'textarea' && (
                <textarea
                  disabled
                  rows={3}
                  className="input text-sm bg-white"
                  placeholder="Long text answer will appear here"
                />
              )}

              {questionType === 'scale' && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">{scaleMin}</span>
                  <div className="flex space-x-1">
                    {Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => (
                      <button
                        key={i}
                        disabled
                        className="w-8 h-8 border border-gray-300 rounded text-sm text-gray-500 bg-white"
                      >
                        {scaleMin + i}
                      </button>
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">{scaleMax}</span>
                </div>
              )}

              {questionType === 'yesno' && (
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input type="radio" disabled className="mr-2" />
                    <span className="text-sm text-gray-700">Yes</span>
                  </label>
                  <label className="flex items-center">
                    <input type="radio" disabled className="mr-2" />
                    <span className="text-sm text-gray-700">No</span>
                  </label>
                </div>
              )}

              {questionType === 'multiplechoice' && options && (
                <div className="space-y-2">
                  {options.filter(option => option && option.trim()).map((option, optionIndex) => (
                    <label key={optionIndex} className="flex items-center">
                      <input type="radio" disabled className="mr-2" />
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">View Feedback Form</h3>
              <p className="text-sm text-gray-500">Preview form structure and questions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-6">
          {/* Form Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-lg font-medium text-gray-900 mb-2">{form.formName}</h4>
            {form.description && (
              <p className="text-sm text-gray-600 mb-3">{form.description}</p>
            )}
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center">
                <BarChart3 className="h-4 w-4 mr-1" />
                <span>{form.questions?.length || 0} questions</span>
              </div>
              <div className="flex items-center">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  form.isActive !== false 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {form.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-4">
            <h5 className="font-medium text-gray-900">Questions</h5>
            {form.questions && form.questions.length > 0 ? (
              <div className="space-y-4">
                {form.questions.map((question, index) => renderQuestionPreview(question, index))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                <p>No questions in this form</p>
              </div>
            )}
          </div>

          {/* Form Stats */}
          {form.questions && form.questions.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h6 className="font-medium text-blue-900 mb-2">Form Statistics</h6>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Total Questions:</span>
                  <span className="ml-2 font-medium">{form.questions.length}</span>
                </div>
                <div>
                  <span className="text-blue-700">Required Questions:</span>
                  <span className="ml-2 font-medium">
                    {form.questions.filter(q => q.isRequired).length}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Question Types:</span>
                  <span className="ml-2 font-medium">
                    {new Set(form.questions.map(q => q.questionType)).size}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Created:</span>
                  <span className="ml-2 font-medium">
                    {new Date(form.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="btn btn-outline"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewFeedbackFormModal;
