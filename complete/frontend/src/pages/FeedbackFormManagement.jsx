import { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  Eye,
  Copy,
  BarChart3,
  Users,
  Calendar,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Link,
  Check,
  Power, 
  PowerOff, 
  History
} from 'lucide-react';
import { adminAPI } from '../services/api';
import CreateFeedbackFormModal from '../components/Modals/CreateFeedbackFormModal';
import EditFeedbackFormModal from '../components/Modals/EditFeedbackFormModal';
import ViewFeedbackFormModal from '../components/Modals/ViewFeedbackFormModal';
import DeleteConfirmModal from '../components/Modals/DeleteConfirmModal';
import toast from 'react-hot-toast';

const FeedbackFormManagement = () => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, deactivated
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showActivationHistoryModal, setShowActivationHistoryModal] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [copiedForms, setCopiedForms] = useState(new Set());

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getFeedbackForms();
      setForms(response.data);
    } catch (error) {
      console.error('Error fetching forms:', error);
      toast.error('Failed to fetch feedback forms');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = (newForm) => {
    setForms(prev => [newForm, ...prev]);
    toast.success('Feedback form created successfully!');
  };

  const handleEditSuccess = (updatedForm) => {
    setForms(prev => 
      prev.map(f => f._id === updatedForm._id ? updatedForm : f)
    );
    toast.success('Feedback form updated successfully!');
  };

  const handleDeleteSuccess = () => {
    setForms(prev => prev.map(f => f._id === selectedForm._id ? { ...f, isActive: false } : f));
    toast.success('Feedback form deactivated successfully!');
  };

  const handleActivation = async (form, action) => {
    const apiCall = action === 'activate' 
      ? adminAPI.activateFeedbackForm
      : adminAPI.deactivateFeedbackForm;
    const toastMessage = action === 'activate'
      ? 'Form activated successfully!'
      : 'Form deactivated successfully!';

    try {
      const response = await apiCall(form._id);
      setForms(prev => 
        prev.map(f => f._id === form._id ? response.data : f)
      );
      toast.success(toastMessage);
    } catch (error) {
      console.error(`Error ${action} form:`, error);
      toast.error(`Failed to ${action} form`);
    }
  };

  const handleActivationHistory = (form) => {
    setSelectedForm(form);
    setShowActivationHistoryModal(true);
  };

  const handleEdit = (form) => {
    setSelectedForm(form);
    setShowEditModal(true);
  };

  const handleView = (form) => {
    setSelectedForm(form);
    setShowViewModal(true);
  };

  const handleDelete = (form) => {
    setSelectedForm(form);
    setShowDeleteModal(true);
  };

  const handleDuplicate = async (form) => {
    try {
      const duplicateData = {
        formName: `${form.formName} (Copy)`,
        description: form.description,
        questions: form.questions.map(q => ({
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options || [],
          isRequired: q.isRequired,
          scaleMin: q.scaleMin,
          scaleMax: q.scaleMax
        }))
      };
      
      const response = await adminAPI.createFeedbackForm(duplicateData);
      setForms(prev => [response.data, ...prev]);
      toast.success('Feedback form duplicated successfully!');
    } catch (error) {
      console.error('Error duplicating form:', error);
      toast.error('Failed to duplicate feedback form');
    }
  };

  const handleCopyLink = async (form) => {
    try {
      const formUrl = `${window.location.origin}/feedback/${form._id}`;
      await navigator.clipboard.writeText(formUrl);
      
      // Add to copied set
      setCopiedForms(prev => new Set([...prev, form._id]));
      
      // Remove from copied set after 2 seconds
      setTimeout(() => {
        setCopiedForms(prev => {
          const newSet = new Set(prev);
          newSet.delete(form._id);
          return newSet;
        });
      }, 2000);
      
      toast.success('Form link copied to clipboard!');
    } catch (error) {
      console.error('Error copying link:', error);
      toast.error('Failed to copy link');
    }
  };

  const confirmDelete = async () => {
    try {
      await adminAPI.deleteFeedbackForm(selectedForm._id);
      handleDeleteSuccess();
      setShowDeleteModal(false);
      setSelectedForm(null);
    } catch (error) {
      console.error('Error deactivating form:', error);
      toast.error('Failed to deactivate feedback form');
    }
  };

  // Filter and search forms
  const filteredForms = forms.filter(f => {
    const matchesSearch = f.formName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (f.description && f.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && f.isActive) ||
                         (filterStatus === 'deactivated' && !f.isActive);
    
    return matchesSearch && matchesFilter;
  });

  const activeCount = forms.filter(f => f.isActive).length;
  const inactiveCount = forms.filter(f => !f.isActive).length;
  const totalQuestions = forms.reduce((total, form) => total + (form.questions?.length || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-royal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feedback Form Management</h1>
          <p className="text-gray-600">Create and manage custom feedback forms</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary btn-lg"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Form
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search forms by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex space-x-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input w-auto"
            >
              <option value="all">All Forms</option>
              <option value="active">Active Forms</option>
              <option value="deactivated">Deactivated Forms</option>
            </select>
          </div>
        </div>
      </div>

      {/* Forms List */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        {filteredForms.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No feedback forms found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm 
                ? 'Try adjusting your search criteria.'
                : 'Get started by creating a new feedback form.'
              }
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Form
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Form
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Questions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredForms.map((form) => (
                  <tr key={form._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {form.formName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {form.description || 'No description'}
                          </div>
                          <div className="text-xs text-gray-400">
                            ID: {form._id.slice(-8)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <BarChart3 className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="font-medium">{form.questions?.length || 0}</span>
                        <span className="text-gray-500 ml-1">questions</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        form.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {form.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(form.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {form.isActive ? (
                          <button
                            onClick={() => handleActivation(form, 'deactivate')}
                            className="text-yellow-600 hover:text-yellow-900 p-1 rounded-md hover:bg-yellow-50 transition-colors"
                            title="Deactivate form"
                          >
                            <PowerOff className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivation(form, 'activate')}
                            className="text-green-600 hover:text-green-900 p-1 rounded-md hover:bg-green-50 transition-colors"
                            title="Activate form"
                          >
                            <Power className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleActivationHistory(form)}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded-md hover:bg-gray-50 transition-colors"
                          title="Activation history"
                        >
                          <History className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleView(form)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50 transition-colors"
                          title="View form"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(form)}
                          className="text-royal-600 hover:text-royal-900 p-1 rounded-md hover:bg-royal-50 transition-colors"
                          title="Edit form"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleCopyLink(form)}
                          className={`p-1 rounded-md transition-colors ${
                            copiedForms.has(form._id)
                              ? 'text-green-600 bg-green-50'
                              : 'text-purple-600 hover:text-purple-900 hover:bg-purple-50'
                          }`}
                          title="Copy form link"
                        >
                          {copiedForms.has(form._id) ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Link className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDuplicate(form)}
                          className="text-green-600 hover:text-green-900 p-1 rounded-md hover:bg-green-50 transition-colors"
                          title="Duplicate form"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(form)}
                          className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50 transition-colors"
                          title="Archive form"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Forms</p>
              <p className="text-2xl font-bold text-gray-900">{forms.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Forms</p>
              <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Questions</p>
              <p className="text-2xl font-bold text-gray-900">{totalQuestions}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Questions/Form</p>
              <p className="text-2xl font-bold text-gray-900">
                {forms.length > 0 ? Math.round(totalQuestions / forms.length) : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateFeedbackFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      <EditFeedbackFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleEditSuccess}
        form={selectedForm}
      />

      <ViewFeedbackFormModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        form={selectedForm}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Archive Feedback Form"
        message={`Are you sure you want to archive "${selectedForm?.formName}"? This will make it inactive and prevent new submissions.`}
        confirmText="Archive"
        loading={false}
      />

      {selectedForm && (
        <ActivationHistoryModal
          isOpen={showActivationHistoryModal}
          onClose={() => setShowActivationHistoryModal(false)}
          form={selectedForm}
        />
      )}
    </div>
  );
};

const ActivationHistoryModal = ({ isOpen, onClose, form }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Activation History for {form.formName}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XCircle className="h-6 w-6" />
          </button>
        </div>
        <div className="space-y-4">
          {form.activationPeriods && form.activationPeriods.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {form.activationPeriods.slice().reverse().map((period, index) => (
                <li key={index} className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">
                        {period.end ? 'Deactivated' : 'Active'}
                      </p>
                      <p className="text-gray-500">
                        {new Date(period.start).toLocaleString()} - {period.end ? new Date(period.end).toLocaleString() : 'Now'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      period.end ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      Period {form.activationPeriods.length - index}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No activation history found for this form.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackFormManagement;
