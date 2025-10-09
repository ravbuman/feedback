import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  User,
  Phone,
  Hash,
  GraduationCap,
  Calendar,
  BookOpen,
  FileText,
  CheckCircle,
  Loader2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Star,
  Hash as HashIcon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { studentAPI } from '../services/api';
import toast from 'react-hot-toast';

const StudentFeedbackSubmission = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [feedbackForm, setFeedbackForm] = useState(null);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [responses, setResponses] = useState({});
  const [activeSubject, setActiveSubject] = useState(null); // accordion state

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm({
    defaultValues: {
      studentName: '',
      phoneNumber: '',
      rollNumber: '',
      course: '',
      year: '',
      semester: ''
    }
  });

  const watchedCourse = watch('course');
  const watchedYear = watch('year');
  const watchedSemester = watch('semester');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (watchedCourse && watchedYear && watchedSemester) {
      fetchSubjects(watchedCourse, watchedYear, watchedSemester);
    }
  }, [watchedCourse, watchedYear, watchedSemester]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [formRes, coursesRes] = await Promise.all([
        studentAPI.getFeedbackForm(formId),
        studentAPI.getCourses()
      ]);

      const formData = formRes.data;
      if (!formData.currentPeriod) {
        toast.error('This feedback form is not currently in an active period');
        navigate('/');
        return;
      }

      setFeedbackForm(formData);
      setCourses(coursesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load feedback form');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async (courseId, year, semester) => {
    try {
      const response = await studentAPI.getSubjectsByCourse(courseId, year, semester);
      setSubjects(response.data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast.error('Failed to load subjects');
    }
  };

  const handleResponseChange = (subjectId, questionIndex, value) => {
    setResponses(prev => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        [questionIndex]: value
      }
    }));
  };

  const onSubmit = async (data) => {
    if (currentStep === 1) {
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      setCurrentStep(3);
      return;
    }

    // Step 3: Submit all responses
    setSubmitting(true);
    try {
      const submissionData = {
        formId: formId,
        studentInfo: {
          name: data.studentName,
          phoneNumber: data.phoneNumber,
          rollNumber: data.rollNumber
        },
        courseInfo: {
          course: data.course,
          year: parseInt(data.year),
          semester: parseInt(data.semester)
        },
        subjectResponses: Object.keys(responses).map(subjectId => {
          const subjectResponses = responses[subjectId];
          const answersWithQuestions = [];

          const maxIndex = Math.max(...Object.keys(subjectResponses).map(Number));

          for (let i = 0; i <= maxIndex; i++) {
            if (subjectResponses[i] !== undefined) {
              answersWithQuestions.push({
                questionId: feedbackForm.questions[i]._id,
                questionText: feedbackForm.questions[i].questionText,
                questionType: feedbackForm.questions[i].questionType,
                options: feedbackForm.questions[i].options || [],
                isRequired: feedbackForm.questions[i].isRequired,
                scaleMin: feedbackForm.questions[i].scaleMin,
                scaleMax: feedbackForm.questions[i].scaleMax,
                answer: subjectResponses[i]
              });
            }
          }

          return {
            subject: subjectId,
            form: formId,
            answersWithQuestions: answersWithQuestions
          };
        })
      };

      await studentAPI.submitFeedback(submissionData);
      toast.success('Feedback submitted successfully! Thank you for your input.');
      navigate('/');
    } catch (error) {
      console.error('Error submitting responses:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestion = (question, questionIndex, subjectId) => {
    const responseValue = responses[subjectId]?.[questionIndex] || '';

    switch (question.questionType) {
      case 'text':
        return (
          <input
            type="text"
            value={responseValue}
            onChange={(e) => handleResponseChange(subjectId, questionIndex, e.target.value)}
            className="input"
            placeholder="Enter your answer"
            required={question.isRequired}
          />
        );
      case 'textarea':
        return (
          <textarea
            value={responseValue}
            onChange={(e) => handleResponseChange(subjectId, questionIndex, e.target.value)}
            className="input"
            rows={4}
            placeholder="Enter your answer"
            required={question.isRequired}
          />
        );
      case 'scale':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>{question.scaleMin}</span>
              <span>{question.scaleMax}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: question.scaleMax - question.scaleMin + 1 }, (_, i) => {
                const value = question.scaleMin + i;
                return (
                  <label key={i} className="flex items-center">
                    <input
                      type="radio"
                      name={`${subjectId}-${questionIndex}`}
                      value={value}
                      checked={responseValue === value.toString()}
                      onChange={(e) => handleResponseChange(subjectId, questionIndex, e.target.value)}
                      className="mr-1"
                      required={question.isRequired}
                    />
                    <span className="text-sm">{value}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      case 'yesno':
        return (
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name={`${subjectId}-${questionIndex}`}
                value="yes"
                checked={responseValue === 'yes'}
                onChange={(e) => handleResponseChange(subjectId, questionIndex, e.target.value)}
                className="mr-2"
                required={question.isRequired}
              />
              <span>Yes</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name={`${subjectId}-${questionIndex}`}
                value="no"
                checked={responseValue === 'no'}
                onChange={(e) => handleResponseChange(subjectId, questionIndex, e.target.value)}
                className="mr-2"
                required={question.isRequired}
              />
              <span>No</span>
            </label>
          </div>
        );
      case 'multiplechoice':
        return (
          <div className="space-y-2">
            {question.options?.filter(option => option && option.trim()).map((option, optionIndex) => (
              <label key={optionIndex} className="flex items-center">
                <input
                  type="radio"
                  name={`${subjectId}-${questionIndex}`}
                  value={option}
                  checked={responseValue === option}
                  onChange={(e) => handleResponseChange(subjectId, questionIndex, e.target.value)}
                  className="mr-2"
                  required={question.isRequired}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );
      default:
        return <div className="text-gray-500">Unsupported question type</div>;
    }
  };

  const getQuestionIcon = (questionType) => {
    switch (questionType) {
      case 'text':
        return <HashIcon className="h-4 w-4 text-blue-500" />;
      case 'textarea':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'scale':
        return <Star className="h-4 w-4 text-yellow-500" />;
      case 'yesno':
        return <CheckCircle className="h-4 w-4 text-purple-500" />;
      case 'multiplechoice':
        return <BookOpen className="h-4 w-4 text-orange-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-royal-600"></div>
      </div>
    );
  }

  if (!feedbackForm) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Feedback form not found</h3>
        <p className="mt-1 text-sm text-gray-500">The requested feedback form could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-0 left-0 p-2 rounded-full hover:bg-gray-100 transition-colors"
          title="Go back"
        >
          <ArrowLeft className="h-5 w-5 md:h-6 md:w-6 text-gray-600" />
        </button>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{feedbackForm.formName}</h1>
          {feedbackForm.description && (
            <p className="mt-2 text-base md:text-lg text-gray-600">{feedbackForm.description}</p>
          )}
        </div>

        {/* Progress Steps */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex items-center justify-center space-x-4 sm:space-x-8 min-w-max">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center flex-shrink-0">
                <div
                  className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full ${currentStep >= step ? 'bg-royal-600 text-white' : 'bg-gray-300 text-gray-600'
                    }`}
                >
                  {step}
                </div>
                <span
                  className={`ml-2 text-xs sm:text-sm font-medium ${currentStep >= step ? 'text-royal-600' : 'text-gray-500'
                    }`}
                >
                  {step === 1
                    ? 'Student Info'
                    : step === 2
                      ? 'Course Selection'
                      : 'Feedback Forms'}
                </span>
                {step < 3 && (
                  <ArrowRight className="ml-2 sm:ml-4 h-3 sm:h-4 w-3 sm:w-4 text-gray-400" />
                )}
              </div>
            ))}
          </div>
        </div>


        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Step 1: Student Information */}
          {currentStep === 1 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Student Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label flex items-center">
                    <User className="h-4 w-4 mr-2 text-gray-500" />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    {...register('studentName', { required: 'Name is required' })}
                    className={`input ${errors.studentName ? 'border-red-300 focus:ring-red-500' : ''}`}
                    placeholder="Enter your full name"
                  />
                  {errors.studentName && (
                    <p className="mt-1 text-sm text-red-600">{errors.studentName.message}</p>
                  )}
                </div>

                <div>
                  <label className="label flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-gray-500" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    {...register('phoneNumber')}
                    className="input"
                    placeholder="Enter your phone number"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="label flex items-center">
                    <Hash className="h-4 w-4 mr-2 text-gray-500" />
                    Roll Number *
                  </label>
                  <input
                    type="text"
                    {...register('rollNumber', { required: 'Roll number is required' })}
                    className={`input ${errors.rollNumber ? 'border-red-300 focus:ring-red-500' : ''}`}
                    placeholder="Enter your roll number"
                  />
                  {errors.rollNumber && (
                    <p className="mt-1 text-sm text-red-600">{errors.rollNumber.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Course Selection */}
          {currentStep === 2 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Course Selection</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="label flex items-center">
                    <GraduationCap className="h-4 w-4 mr-2 text-gray-500" />
                    Course *
                  </label>
                  <select
                    {...register('course', { required: 'Course selection is required' })}
                    className={`input ${errors.course ? 'border-red-300 focus:ring-red-500' : ''}`}
                  >
                    <option value="">Select a course</option>
                    {courses.map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.courseName} ({course.courseCode})
                      </option>
                    ))}
                  </select>
                  {errors.course && (
                    <p className="mt-1 text-sm text-red-600">{errors.course.message}</p>
                  )}
                </div>

                <div>
                  <label className="label flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    Year *
                  </label>
                  <select
                    {...register('year', { required: 'Year selection is required' })}
                    className={`input ${errors.year ? 'border-red-300 focus:ring-red-500' : ''}`}
                  >
                    <option value="">Select year</option>
                    <option value={1}>Year 1</option>
                    <option value={2}>Year 2</option>
                    <option value={3}>Year 3</option>
                    <option value={4}>Year 4</option>
                  </select>
                  {errors.year && (
                    <p className="mt-1 text-sm text-red-600">{errors.year.message}</p>
                  )}
                </div>

                <div>
                  <label className="label flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    Semester *
                  </label>
                  <select
                    {...register('semester', { required: 'Semester selection is required' })}
                    className={`input ${errors.semester ? 'border-red-300 focus:ring-red-500' : ''}`}
                  >
                    <option value="">Select semester</option>
                    <option value={1}>Semester 1</option>
                    <option value={2}>Semester 2</option>
                    <option value={3}>Semester 3</option>
                    <option value={4}>Semester 4</option>
                    <option value={5}>Semester 5</option>
                    <option value={6}>Semester 6</option>
                    <option value={7}>Semester 7</option>
                    <option value={8}>Semester 8</option>
                  </select>
                  {errors.semester && (
                    <p className="mt-1 text-sm text-red-600">{errors.semester.message}</p>
                  )}
                </div>
              </div>

              {subjects.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Available Subjects</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {subjects.map((subject) => (
                      <div key={subject._id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center">
                          <BookOpen className="h-5 w-5 text-purple-600 mr-3" />
                          <div>
                            <div className="font-medium text-gray-900">{subject.subjectName}</div>
                            {subject.faculty && (
                              <div className="text-sm text-gray-500">
                                Faculty: {typeof subject.faculty === 'object' ? subject.faculty.name : 'Loading...'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Feedback Forms with Accordion */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Feedback Forms</h2>
                <p className="text-gray-600 mb-6">
                  Please fill out the feedback form for each subject. Click on a subject to open its form.
                </p>
              </div>

              {subjects.map((subject) => (
                <div key={subject._id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                  {/* Header */}
                  <button
                    type="button"
                    onClick={() => setActiveSubject(prev => prev === subject._id ? null : subject._id)}
                    className="w-full flex justify-between items-center p-4 text-left hover:bg-gray-50 focus:outline-none"
                  >
                    <div className="flex items-center">
                      <BookOpen className="h-6 w-6 text-purple-600 mr-3" />
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{subject.subjectName}</h3>
                        {subject.faculty && (
                          <p className="text-sm text-gray-500">
                            Faculty: {typeof subject.faculty === 'object' ? subject.faculty.name : 'Loading...'}
                          </p>
                        )}
                      </div>
                    </div>
                    {activeSubject === subject._id ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </button>

                  {/* Body */}
                  {activeSubject === subject._id && (
                    <div className="p-6 border-t space-y-6">
                      {feedbackForm.questions?.map((question, questionIndex) => (
                        <div key={questionIndex} className="border-l-4 border-royal-200 pl-4">
                          <div className="flex items-start space-x-3 mb-3">
                            <div className="flex-shrink-0 mt-1">
                              {getQuestionIcon(question.questionType)}
                            </div>
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-gray-900 mb-2">
                                {question.questionText}
                                {question.isRequired && (
                                  <span className="text-red-500 ml-1">*</span>
                                )}
                              </label>
                              {renderQuestion(question, questionIndex, subject._id)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row justify-between mt-8 gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              className="inline-flex items-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm sm:text-base hover:bg-gray-50 transition disabled:opacity-50"
            >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Previous
            </button>

            <button
              type="submit"
              className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg bg-royal-600 text-white font-medium text-sm sm:text-base hover:bg-royal-700 transition disabled:opacity-50 justify-center"
              disabled={submitting || (currentStep === 2 && subjects.length === 0)}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3 w-3 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                  Submitting...
                </>
              ) : currentStep === 3 ? (
                'Submit All Feedback'
              ) : (
                <>
                  Next
                  <ArrowRight className="h-3 w-3 sm:h-4 ml-1 sm:ml-2" />
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default StudentFeedbackSubmission;
