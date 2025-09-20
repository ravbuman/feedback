import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { X, Plus, Trash2, FileText, BarChart3, Loader2, Move, GripVertical } from 'lucide-react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

const EditFeedbackFormModal = ({ isOpen, onClose, onSuccess, form }) => {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch,
    setValue
  } = useForm({
    defaultValues: {
      formName: '',
      description: '',
      questions: []
    }
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'questions'
  });

  useEffect(() => {
    if (form && isOpen) {
      setValue('formName', form.formName || '');
      setValue('description', form.description || '');
      setValue('questions', form.questions || []);
    }
  }, [form, isOpen, setValue]);

  const questionTypes = [
    { value: 'text', label: 'Short Text', description: 'Single line text input' },
    { value: 'textarea', label: 'Long Text', description: 'Multi-line text input' },
    { value: 'scale', label: 'Rating Scale', description: 'Numeric rating (1-5, 1-10, etc.)' },
    { value: 'yesno', label: 'Yes/No', description: 'Binary choice question' },
    { value: 'multiplechoice', label: 'Multiple Choice', description: 'Select one from options' }
  ];

  const addQuestion = (type) => {
    const newQuestion = {
      questionText: '',
      questionType: type,
      options: type === 'multiplechoice' ? ['', ''] : [],
      isRequired: true,
      scaleMin: 1,
      scaleMax: 5
    };
    append(newQuestion);
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await adminAPI.updateFeedbackForm(form._id, data);
      toast.success('Feedback form updated successfully!');
      onSuccess?.(response.data);
      onClose();
    } catch (error) {
      console.error('Error updating form:', error);
      toast.error(error.response?.data?.message || 'Failed to update feedback form');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen || !form) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Edit Feedback Form</h3>
              <p className="text-sm text-gray-500">Modify your feedback form</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Form Basic Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h4 className="font-medium text-gray-900">Form Information</h4>
            
            <div>
              <label className="label">Form Name *</label>
              <input
                type="text"
                {...register('formName', { 
                  required: 'Form name is required',
                  minLength: { value: 2, message: 'Form name must be at least 2 characters' }
                })}
                className={`input ${errors.formName ? 'border-red-300 focus:ring-red-500' : ''}`}
                placeholder="Enter form name"
              />
              {errors.formName && (
                <p className="mt-1 text-sm text-red-600">{errors.formName.message}</p>
              )}
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                {...register('description')}
                className="input"
                rows={3}
                placeholder="Enter form description (optional)"
              />
            </div>
          </div>

          {/* Questions Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Questions</h4>
              <div className="flex space-x-2">
                {questionTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => addQuestion(type.value)}
                    className="btn btn-outline btn-sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {fields.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No questions yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add questions to build your feedback form
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <QuestionBuilder
                    key={field.id}
                    index={index}
                    register={register}
                    errors={errors}
                    questionTypes={questionTypes}
                    watch={watch}
                    onRemove={() => remove(index)}
                    onMoveUp={index > 0 ? () => move(index, index - 1) : null}
                    onMoveDown={index < fields.length - 1 ? () => move(index, index + 1) : null}
                    isFirst={index === 0}
                    isLast={index === fields.length - 1}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-outline flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={loading || fields.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Form'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Question Builder Component (same as CreateFeedbackFormModal)
const QuestionBuilder = ({ 
  index, 
  register, 
  errors, 
  questionTypes, 
  onRemove, 
  onMoveUp, 
  onMoveDown, 
  isFirst, 
  isLast,
  watch
}) => {
  const questionType = watch(`questions.${index}.questionType`);
  const isMultipleChoice = questionType === 'multiplechoice';
  const isScale = questionType === 'scale';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-2">
          <GripVertical className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-500">Question {index + 1}</span>
        </div>
        <div className="flex items-center space-x-1">
          {onMoveUp && (
            <button
              type="button"
              onClick={onMoveUp}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Move up"
            >
              <Move className="h-4 w-4 rotate-180" />
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              onClick={onMoveDown}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Move down"
            >
              <Move className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-red-400 hover:text-red-600"
            title="Remove question"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Question Text */}
        <div>
          <label className="label">Question Text *</label>
          <input
            type="text"
            {...register(`questions.${index}.questionText`, { 
              required: 'Question text is required' 
            })}
            className={`input ${errors.questions?.[index]?.questionText ? 'border-red-300 focus:ring-red-500' : ''}`}
            placeholder="Enter your question"
          />
          {errors.questions?.[index]?.questionText && (
            <p className="mt-1 text-sm text-red-600">
              {errors.questions[index].questionText.message}
            </p>
          )}
        </div>

        {/* Question Type */}
        <div>
          <label className="label">Question Type *</label>
          <select
            {...register(`questions.${index}.questionType`, { 
              required: 'Question type is required' 
            })}
            className="input"
          >
            {questionTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label} - {type.description}
              </option>
            ))}
          </select>
        </div>

        {/* Multiple Choice Options */}
        {isMultipleChoice && (
          <div>
            <label className="label">Options *</label>
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((optionIndex) => (
                <input
                  key={optionIndex}
                  type="text"
                  {...register(`questions.${index}.options.${optionIndex}`)}
                  className="input"
                  placeholder={`Option ${optionIndex + 1}`}
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Leave empty options blank - they will be ignored
            </p>
          </div>
        )}

        {/* Scale Settings */}
        {isScale && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Minimum Value</label>
              <input
                type="number"
                {...register(`questions.${index}.scaleMin`, { 
                  valueAsNumber: true,
                  min: 0
                })}
                className="input"
                placeholder="1"
              />
            </div>
            <div>
              <label className="label">Maximum Value</label>
              <input
                type="number"
                {...register(`questions.${index}.scaleMax`, { 
                  valueAsNumber: true,
                  min: 1
                })}
                className="input"
                placeholder="5"
              />
            </div>
          </div>
        )}

        {/* Required Toggle */}
        <div className="flex items-center">
          <input
            type="checkbox"
            {...register(`questions.${index}.isRequired`)}
            className="h-4 w-4 text-royal-600 focus:ring-royal-500 border-gray-300 rounded"
          />
          <label className="ml-2 text-sm text-gray-700">
            This question is required
          </label>
        </div>
      </div>
    </div>
  );
};

export default EditFeedbackFormModal;
