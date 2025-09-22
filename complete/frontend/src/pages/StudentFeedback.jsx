import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentAPI } from '../services/api';
import { GraduationCap, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const StudentFeedback = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(null);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [formData, setFormData] = useState({
    studentName: '',
    phoneNumber: '',
    rollNumber: '',
    course: '',
    year: '',
    semester: '',
    subjectResponses: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch feedback form
        const formResponse = await studentAPI.getFeedbackForm(formId);
        setForm(formResponse.data);

        // Fetch courses
        const coursesResponse = await studentAPI.getCourses();
        setCourses(coursesResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        if (error.response?.data?.message) {
          toast.error(error.response.data.message);
        }
        setForm({ error: error.response?.data?.message || 'Failed to load form data' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [formId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCourseChange = async (e) => {
    const courseId = e.target.value;
    setFormData(prev => ({
      ...prev,
      course: courseId,
      year: '',
      semester: '',
      subjectResponses: [],
    }));
    setSubjects([]);
  };

  const handleYearSemesterChange = async (e) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);

    const { course, year, semester } = newFormData;

    if (course && year && semester) {
      try {
        const response = await studentAPI.getSubjectsByCourse(course, year, semester);
        setSubjects(response.data);

        // Initialize subject responses
        const subjectResponses = response.data.map(subject => ({
          subject: subject._id,
          faculty: subject.faculty?._id,
          answers: form.questions.map(q => ({ questionId: q._id, answer: '' }))
        }));

        setFormData(prev => ({
          ...prev,
          subjectResponses,
        }));
      } catch (error) {
        console.error('Error fetching subjects:', error);
        toast.error('Failed to load subjects for the selected criteria');
        setSubjects([]);
        setFormData(prev => ({ ...prev, subjectResponses: [] }));
      }
    }
  };

  const handleAnswerChange = (subjectIndex, questionIndex, answer) => {
    setFormData(prev => ({
      ...prev,
      subjectResponses: prev.subjectResponses.map((subjectResponse, sIndex) =>
        sIndex === subjectIndex
          ? {
            ...subjectResponse,
            answers: subjectResponse.answers.map((ans, qIndex) =>
              qIndex === questionIndex
                ? { ...ans, answer }
                : ans
            )
          }
          : subjectResponse
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      formId,
      studentInfo: {
        name: formData.studentName,
        phoneNumber: formData.phoneNumber,
        rollNumber: formData.rollNumber,
      },
      courseInfo: {
        course: formData.course,
        year: formData.year,
        semester: formData.semester,
      },
      subjectResponses: formData.subjectResponses,
    };

    try {
      await studentAPI.submitFeedback(payload);
      toast.success('Feedback submitted successfully!');
      navigate('/', { state: { success: true } });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error(error.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!form || form.error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Form not available</h3>
          <p className="mt-1 text-sm text-gray-500">
            {form?.error || "The feedback form you're looking for doesn't exist or is inactive."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <GraduationCap className="mx-auto h-12 w-12 text-primary-600" />
        <h1 className="mt-4 text-3xl font-bold text-gray-900">{form.formName}</h1>
        {form.description && (
          <p className="mt-2 text-lg text-gray-600">{form.description}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Student Information */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Student Information</h2>
            <p className="card-description">
              Please provide your personal details
            </p>
          </div>
          <div className="card-content space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Full Name</label>
                <input
                  type="text"
                  name="studentName"
                  required
                  className="input"
                  value={formData.studentName}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="label">Phone Number</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  required
                  className="input"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div>
              <label className="label">Roll Number</label>
              <input
                type="text"
                name="rollNumber"
                required
                className="input"
                value={formData.rollNumber}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </div>

        {/* Course Selection */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Course Selection</h2>
            <p className="card-description">
              Select your course, year, and semester
            </p>
          </div>
          <div className="card-content space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="label">Course</label>
                <select
                  name="course"
                  required
                  className="input"
                  value={formData.course}
                  onChange={handleCourseChange}
                >
                  <option value="">Select Course</option>
                  {courses.map(course => (
                    <option key={course._id} value={course._id}>
                      {course.courseName} ({course.courseCode})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Year</label>
                <select
                  name="year"
                  required
                  className="input"
                  value={formData.year}
                  onChange={handleInputChange}
                >
                  <option value="">Select Year</option>
                  {formData.course && courses.find(c => c._id === formData.course)?.years.map(year => (
                    <option key={year} value={year}>Year {year}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Semester</label>
                <select
                  name="semester"
                  required
                  className="input"
                  value={formData.semester}
                  onChange={(e) => {
                    handleInputChange(e);
                    setTimeout(handleYearSemesterChange, 100);
                  }}
                >
                  <option value="">Select Semester</option>
                  {formData.course && courses.find(c => c._id === formData.course)?.semesters.map(semester => (
                    <option key={semester} value={semester}>Semester {semester}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Subject Feedback */}
        {subjects.length > 0 && (
          <div className="space-y-6">
            {subjects.map((subject, subjectIndex) => (
              <div key={subject._id} className="card">
                <div className="card-header">
                  <h3 className="card-title">{subject.subjectName}</h3>
                  <p className="card-description">
                    Faculty: {subject.faculty.name} ({subject.faculty.designation})
                  </p>
                </div>
                <div className="card-content space-y-4">
                  {form.questions.map((question, questionIndex) => (
                    <div key={question._id}>
                      <label className="label">
                        {question.questionText}
                        {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {question.questionType === 'text' && (
                        <input
                          type="text"
                          className="input"
                          value={formData.subjectResponses[subjectIndex]?.answers[questionIndex]?.answer || ''}
                          onChange={(e) => handleAnswerChange(subjectIndex, questionIndex, e.target.value)}
                        />
                      )}
                      {question.questionType === 'textarea' && (
                        <textarea
                          className="input min-h-[100px]"
                          value={formData.subjectResponses[subjectIndex]?.answers[questionIndex]?.answer || ''}
                          onChange={(e) => handleAnswerChange(subjectIndex, questionIndex, e.target.value)}
                        />
                      )}
                      {question.questionType === 'scale' && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">{question.scaleMin}</span>
                          <input
                            type="range"
                            min={question.scaleMin}
                            max={question.scaleMax}
                            className="flex-1"
                            value={formData.subjectResponses[subjectIndex]?.answers[questionIndex]?.answer || question.scaleMin}
                            onChange={(e) => handleAnswerChange(subjectIndex, questionIndex, parseInt(e.target.value))}
                          />
                          <span className="text-sm text-gray-500">{question.scaleMax}</span>
                          <span className="text-sm font-medium">
                            {formData.subjectResponses[subjectIndex]?.answers[questionIndex]?.answer || question.scaleMin}
                          </span>
                        </div>
                      )}
                      {question.questionType === 'yesno' && (
                        <div className="flex space-x-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`${subject._id}-${question._id}`}
                              value="yes"
                              className="mr-2"
                              checked={formData.subjectResponses[subjectIndex]?.answers[questionIndex]?.answer === 'yes'}
                              onChange={(e) => handleAnswerChange(subjectIndex, questionIndex, e.target.value)}
                            />
                            Yes
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`${subject._id}-${question._id}`}
                              value="no"
                              className="mr-2"
                              checked={formData.subjectResponses[subjectIndex]?.answers[questionIndex]?.answer === 'no'}
                              onChange={(e) => handleAnswerChange(subjectIndex, questionIndex, e.target.value)}
                            />
                            No
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-center">
          <button
            type="submit"
            disabled={submitting || subjects.length === 0}
            className="btn btn-primary btn-lg"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-5 w-5" />
                Submit Feedback
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StudentFeedback;
