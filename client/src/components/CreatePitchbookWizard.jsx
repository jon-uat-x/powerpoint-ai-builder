import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePitchbook } from '../contexts/PitchbookContext';
import './CreatePitchbookWizard.css';

const CreatePitchbookWizard = () => {
  const navigate = useNavigate();
  const { createPitchbook, loading } = usePitchbook();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    type: 'standard',
    sections: []
  });
  
  const [newSection, setNewSection] = useState({
    title: '',
    numberOfSlides: 1
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSectionChange = (e) => {
    const { name, value } = e.target;
    setNewSection(prev => ({
      ...prev,
      [name]: name === 'numberOfSlides' ? parseInt(value) || 1 : value
    }));
  };

  const addSection = () => {
    if (newSection.title) {
      setFormData(prev => ({
        ...prev,
        sections: [...prev.sections, { ...newSection }]
      }));
      setNewSection({ title: '', numberOfSlides: 1 });
    }
  };

  const removeSection = (index) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index)
    }));
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCancel = () => {
    const confirmCancel = window.confirm('Are you sure you want to cancel? All progress will be lost.');
    if (confirmCancel) {
      navigate('/pitchbooks');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || formData.sections.length === 0) {
      alert('Please provide a title and at least one section');
      return;
    }

    try {
      const pitchbook = await createPitchbook(formData);
      navigate(`/pitchbook/${pitchbook.id}/edit`);
    } catch (error) {
      console.error('Failed to create pitchbook:', error);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.title.trim() !== '';
      case 2:
        return formData.sections.length > 0;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="wizard-container">
      <div className="wizard-card">
        <div className="wizard-header">
          <h2 className="wizard-title">Create New Pitchbook</h2>
          <div className="wizard-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${(currentStep / 3) * 100}%` }}
              />
            </div>
            <div className="progress-steps">
              <span className={`step ${currentStep >= 1 ? 'active' : ''}`}>1. Basic Info</span>
              <span className={`step ${currentStep >= 2 ? 'active' : ''}`}>2. Sections</span>
              <span className={`step ${currentStep >= 3 ? 'active' : ''}`}>3. Review</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="wizard-form">
          {currentStep === 1 && (
            <div className="wizard-step">
              <h3 className="step-title">Basic Information</h3>
              <div className="form-group">
                <label className="form-label">Pitchbook Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="form-control"
                  placeholder="Enter pitchbook title"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Pitchbook Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="form-control"
                >
                  <option value="standard">Standard Presentation</option>
                  <option value="investment">Investment Review</option>
                  <option value="quarterly">Quarterly Report</option>
                  <option value="proposal">Business Proposal</option>
                </select>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="wizard-step">
              <h3 className="step-title">Add Sections</h3>
              
              <div className="section-form">
                <div className="form-group">
                  <label className="form-label">Section Title</label>
                  <input
                    type="text"
                    name="title"
                    value={newSection.title}
                    onChange={handleSectionChange}
                    className="form-control"
                    placeholder="Enter section title"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Number of Slides</label>
                  <input
                    type="number"
                    name="numberOfSlides"
                    value={newSection.numberOfSlides}
                    onChange={handleSectionChange}
                    className="form-control"
                    min="1"
                    max="20"
                  />
                </div>
                <button
                  type="button"
                  onClick={addSection}
                  className="btn btn-primary"
                  disabled={!newSection.title}
                >
                  Add Section
                </button>
              </div>

              <div className="sections-list">
                <h4 className="sections-title">Sections ({formData.sections.length})</h4>
                {formData.sections.length === 0 ? (
                  <p className="text-muted">No sections added yet</p>
                ) : (
                  formData.sections.map((section, index) => (
                    <div key={index} className="section-item">
                      <div className="section-info">
                        <span className="section-name">{section.title}</span>
                        <span className="section-slides">{section.numberOfSlides} slides</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSection(index)}
                        className="btn btn-sm btn-danger"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="wizard-step">
              <h3 className="step-title">Review & Create</h3>
              
              <div className="review-section">
                <h4>Pitchbook Details</h4>
                <div className="review-item">
                  <span className="review-label">Title:</span>
                  <span className="review-value">{formData.title}</span>
                </div>
                <div className="review-item">
                  <span className="review-label">Type:</span>
                  <span className="review-value">{formData.type}</span>
                </div>
              </div>

              <div className="review-section">
                <h4>Slide Structure</h4>
                <div className="review-slides">
                  <div className="slide-item">
                    <span className="slide-number">1</span>
                    <span className="slide-type">Title Slide</span>
                  </div>
                  <div className="slide-item">
                    <span className="slide-number">2</span>
                    <span className="slide-type">Contents</span>
                  </div>
                  <div className="slide-item">
                    <span className="slide-number">3</span>
                    <span className="slide-type">Legal Notice</span>
                  </div>
                  
                  {formData.sections.map((section, sIndex) => {
                    let slideNum = 4 + sIndex;
                    const slides = [];
                    
                    slides.push(
                      <div key={`divider-${sIndex}`} className="slide-item">
                        <span className="slide-number">{slideNum++}</span>
                        <span className="slide-type">Section: {section.title}</span>
                      </div>
                    );
                    
                    for (let i = 0; i < section.numberOfSlides; i++) {
                      slides.push(
                        <div key={`body-${sIndex}-${i}`} className="slide-item">
                          <span className="slide-number">{slideNum++}</span>
                          <span className="slide-type">Body Slide {i + 1}</span>
                        </div>
                      );
                    }
                    
                    return slides;
                  })}
                </div>
                <div className="review-total">
                  Total Slides: {3 + formData.sections.reduce((acc, s) => acc + s.numberOfSlides + 1, 0)}
                </div>
              </div>
            </div>
          )}

          <div className="wizard-footer">
            <div className="wizard-footer-left">
              <button
                type="button"
                onClick={handleCancel}
                className="btn btn-danger btn-cancel"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
            
            <div className="wizard-footer-right">
              <button
                type="button"
                onClick={handleBack}
                className="btn btn-secondary"
                disabled={currentStep === 1}
              >
                Back
              </button>
              
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn btn-primary"
                  disabled={!isStepValid()}
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={loading || !isStepValid()}
                >
                  {loading ? 'Creating...' : 'Create Pitchbook'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePitchbookWizard;