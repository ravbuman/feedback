import { useEffect, useMemo, useState } from 'react';
import { X, Upload, AlertTriangle, FileSpreadsheet, Loader2, Edit3, CheckCircle2 } from 'lucide-react';
import { adminAPI } from '../../services/api';

const REQUIRED_HEADERS = [
  'Name',
  'Phone Number',
  'Dept/Course',
  'Designation',
  'Subject',
  'Year',
  'Semester',
];

const parseCSV = async (file) => {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map((line, idx) => {
    const cells = line.split(',').map(c => c.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? '' });
    return { __row: idx + 2, ...row };
  });
  return { headers, rows };
};

const BulkUploadFacultyModal = ({ isOpen, onClose }) => {
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [validating, setValidating] = useState(false);
  const [errorsByRow, setErrorsByRow] = useState({});
  const [readyPayload, setReadyPayload] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const fetchMeta = async () => {
      try {
        const [coursesRes, subjectsRes] = await Promise.all([
          adminAPI.getCourses(),
          adminAPI.getSubjects(),
        ]);
        const courseNames = Array.isArray(coursesRes?.data) ? coursesRes.data.map(c => ({
          id: c._id,
          name: c.courseName,
          code: c.courseCode,
          isActive: c.isActive !== false,
        })) : [];
        setCourses(courseNames);
        setSubjects(Array.isArray(subjectsRes?.data) ? subjectsRes.data : []);
      } catch (e) {
        console.error('Error fetching metadata for bulk upload', e);
      }
    };
    fetchMeta();
  }, [isOpen]);

  const resetState = () => {
    setUploading(false);
    setParsing(false);
    setFileName('');
    setHeaders([]);
    setRows([]);
    setErrorsByRow({});
    setValidating(false);
    setReadyPayload(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    try {
      const { headers: hdrs, rows: parsedRows } = await parseCSV(file);
      setFileName(file.name);
      setHeaders(hdrs);
      setRows(parsedRows);
    } finally {
      setParsing(false);
    }
  };

  const headerIssues = useMemo(() => {
    const missing = REQUIRED_HEADERS.filter(h => !headers.includes(h));
    return missing;
  }, [headers]);

  const findCourseByName = (name) => courses.find(c => c.name?.toLowerCase() === (name || '').toLowerCase());
  const findSubjectMatch = (subjectName, courseName, year, semester) => {
    const course = findCourseByName(courseName);
    return subjects.find(s => {
      const sCourse = typeof s.course === 'object' ? (s.course.courseName || s.course.name) : s.course;
      const sCourseName = (sCourse || '').toString().toLowerCase();
      return (
        (s.subjectName || '').toLowerCase() === (subjectName || '').toLowerCase() &&
        sCourseName === (course?.name || '').toLowerCase() &&
        String(s.year || '').toLowerCase() === String(year || '').toLowerCase() &&
        String(s.semester || '').toLowerCase() === String(semester || '').toLowerCase()
      );
    });
  };

  const computeSubjectCode = (subjectName) => {
    if (!subjectName) return '';
    const words = subjectName.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].slice(0, 3).toUpperCase();
    }
    return words.map(w => w[0]).join('').toUpperCase();
  };

  const validateRows = () => {
    const newErrors = {};
    const sanitizedRows = rows.map(r => ({ ...r }));

    sanitizedRows.forEach((r) => {
      const rowErrors = [];
      const name = r['Name'];
      const phone = r['Phone Number'];
      const dept = r['Dept/Course'];
      const designation = r['Designation'];
      const subject = r['Subject'];
      const year = r['Year'];
      const semester = r['Semester'];

      if (!name) rowErrors.push('Name is required');
      if (!phone) rowErrors.push('Phone Number is required');
      if (!dept) rowErrors.push('Dept/Course is required');
      if (!designation) rowErrors.push('Designation is required');

      const course = findCourseByName(dept);
      if (!course) {
        rowErrors.push('Course not found');
      }

      // Subject/Year/Semester checks are deferred to backend per requirement

      if (rowErrors.length > 0) {
        newErrors[r.__row] = rowErrors;
      }
    });

    setErrorsByRow(newErrors);
    return newErrors;
  };

  const buildPayload = () => {
    const items = rows.map(r => {
      const course = findCourseByName(r['Dept/Course']);
      const semesterNum = parseInt(r['Semester'], 10);
      const existingSubject = course && findSubjectMatch(r['Subject'], r['Dept/Course'], r['Year'], semesterNum);
      const subjectCode = existingSubject ? existingSubject.subjectCode : computeSubjectCode(r['Subject']);
      return {
        name: r['Name'],
        phoneNumber: r['Phone Number'],
        department: r['Dept/Course'],
        designation: r['Designation'],
        subject: {
          name: r['Subject'],
          code: subjectCode,
          courseName: r['Dept/Course'],
          year: r['Year'],
          semester: semesterNum,
        },
      };
    });
    return { items };
  };

  const runValidationAndPrepare = () => {
    setValidating(true);
    // Block if headers missing
    if (REQUIRED_HEADERS.some(h => !headers.includes(h))) {
      setValidating(false);
      setReadyPayload(null);
      return false;
    }
    const errs = validateRows();
    const hasErrors = Object.keys(errs).length > 0;
    if (!hasErrors) {
      const payload = buildPayload();
      setReadyPayload(payload);
      setValidating(false);
      return payload;
    }
    setReadyPayload(null);
    setValidating(false);
    return false;
  };

  const updateCell = (rowNum, header, value) => {
    setRows(prev => prev.map(r => r.__row === rowNum ? { ...r, [header]: value } : r));
    setErrorsByRow(prev => {
      const copy = { ...prev };
      delete copy[rowNum];
      return copy;
    });
  };

  const onSubmit = async () => {
    const payload = runValidationAndPrepare();
    if (!payload) return; // show inline errors; user can fix
    setUploading(true);
    try {
      await adminAPI.bulkUploadFaculty(payload);
      handleClose();
    } catch (e) {
      console.error('Bulk upload failed', e);
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Bulk Upload Faculty</h3>
              <p className="text-sm text-gray-500">Upload CSV with required columns and resolve any issues</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">CSV Requirements</p>
              <p>Include columns: Name, Phone Number, Dept/Course, Designation, Subject, Year, Semester.</p>
              <p className="mt-1">- Dept/Course must match an existing course name. If not, you can change it inline below.</p>
              <p>- Subject will be created if it does not exist. Subject Code rule: single-word → first 3 letters; multi-word → initials.</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:bg-gray-50 flex-1">
              <Upload className="h-5 w-5 text-gray-500" />
              <span className="text-sm text-gray-700">{fileName || 'Choose CSV file'}</span>
              <input type="file" accept=".csv" className="hidden" onChange={onFileChange} />
            </label>
          </div>

          {headers.length > 0 && headerIssues.length > 0 && (
            <div className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
              Missing columns: {headerIssues.join(', ')}
            </div>
          )}

          {rows.length > 0 && (
            <div className="overflow-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Row</th>
                    {REQUIRED_HEADERS.map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rows.map((r) => {
                    const rowErrs = errorsByRow[r.__row] || [];
                    return (
                      <tr key={r.__row} className={rowErrs.length ? 'bg-red-50' : ''}>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-500">{r.__row}</td>
                        {REQUIRED_HEADERS.map((h) => (
                          <td key={h} className="px-3 py-2 whitespace-nowrap">
                            {h === 'Dept/Course' ? (
                              <select
                                className="input"
                                value={r[h] || ''}
                                onChange={(e) => updateCell(r.__row, h, e.target.value)}
                              >
                                <option value="">Select course</option>
                                {courses.map(c => (
                                  <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                className="input"
                                value={r[h] || ''}
                                onChange={(e) => updateCell(r.__row, h, e.target.value)}
                              />
                            )}
                          </td>
                        ))}
                        <td className="px-3 py-2 whitespace-nowrap">
                          {rowErrs.length > 0 ? (
                            <span className="inline-flex items-center text-xs text-red-700">
                              <Edit3 className="h-4 w-4 mr-1" /> Fix: {rowErrs.join(', ')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs text-green-700">
                              <CheckCircle2 className="h-4 w-4 mr-1" /> Ready
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={handleClose} className="btn btn-outline" disabled={uploading}>Cancel</button>
            <button onClick={onSubmit} className="btn btn-primary" disabled={parsing || rows.length === 0 || uploading}>
              {uploading || validating ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {uploading ? 'Uploading...' : 'Validating...'}</>) : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkUploadFacultyModal;


