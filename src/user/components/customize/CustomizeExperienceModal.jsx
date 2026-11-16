import React, { useState, useEffect } from 'react';
import { useUserExperience } from '../../../context/UserExperienceContext';
import api from '../../../api';
import { X, Check, ChevronDown, Search } from 'lucide-react';
import './CustomizeExperienceModal.scss';

const SearchableSelect = ({ options, value, onChange, placeholder, disabled, loading }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = React.useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt => opt.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className={`cem-select ${disabled ? 'disabled' : ''}`} ref={dropdownRef}>
            <div 
                className="cem-select-header" 
                onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
            >
                <span className="cem-select-value">{loading ? "Loading..." : (value ? value.name : placeholder)}</span>
                <ChevronDown size={18} className={`cem-select-icon ${isOpen ? 'open' : ''}`} />
            </div>
            
            {isOpen && !disabled && !loading && (
                <div className="cem-select-body">
                    <div className="cem-select-search-wrap">
                        <Search size={16} className="cem-search-icon" />
                        <input 
                            type="text" 
                            className="cem-select-search" 
                            placeholder="Type to search..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            autoFocus
                        />
                    </div>
                    <ul className="cem-select-options">
                        {filteredOptions.length > 0 ? filteredOptions.map(opt => (
                            <li 
                                key={opt.id} 
                                className={`cem-select-option ${value?.id === opt.id ? 'selected' : ''}`}
                                onClick={() => {
                                    onChange(opt);
                                    setIsOpen(false);
                                    setSearch("");
                                }}
                            >
                                <span className="opt-name">{opt.name}</span>
                                {value?.id === opt.id && <Check size={16} className="opt-check" />}
                            </li>
                        )) : (
                            <li className="cem-select-empty">No results found</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default function CustomizeExperienceModal() {
    const { isCustomizeModalOpen, closeCustomizeModal, savePreferences, preferences, clearPreferences } = useUserExperience();
    const [mainDegrees, setMainDegrees] = useState([]);
    const [subDegrees, setSubDegrees] = useState([]);
    
    const [selectedMain, setSelectedMain] = useState(null);
    const [selectedSub, setSelectedSub] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isCustomizeModalOpen) {
            setSelectedMain(preferences.mainDegree || null);
            setSelectedSub(preferences.subDegree || null);
        }
    }, [isCustomizeModalOpen, preferences]);

    useEffect(() => {
        if (isCustomizeModalOpen) {
            setLoading(true);
            api.get('/api/mainDegrees')
                .then(res => {
                    setMainDegrees(res.data?.data || res.data || []);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Failed to fetch main degrees", err);
                    setLoading(false);
                });
        }
    }, [isCustomizeModalOpen]);

    useEffect(() => {
        if (selectedMain) {
            setSubDegrees([]);
            api.get(`/api/subDegrees?mainDegreeId=${selectedMain.id}`)
                .then(res => setSubDegrees(res.data?.data || res.data || []))
                .catch(console.error);
        } else {
            setSubDegrees([]);
        }
    }, [selectedMain]);

    if (!isCustomizeModalOpen) return null;

    const handleSave = () => {
        if (selectedMain && selectedSub) {
            savePreferences(selectedMain, selectedSub);
            closeCustomizeModal();
        }
    };

    const handleClear = () => {
        clearPreferences();
        closeCustomizeModal();
    };

    return (
        <div className="cem-overlay" onClick={closeCustomizeModal}>
            <div className="cem-modal" onClick={e => e.stopPropagation()}>
                <button className="cem-close" onClick={closeCustomizeModal}><X size={20} /></button>
                <div className="cem-header">
                    <h2>Personalize Your Experience</h2>
                    <p>Select your course to see tailored study materials instantly.</p>
                </div>
                
                <div className="cem-body">
                    <div className="cem-section">
                        <label>1. Select Main Category</label>
                        <SearchableSelect 
                            options={mainDegrees}
                            value={selectedMain}
                            onChange={md => { setSelectedMain(md); setSelectedSub(null); }}
                            placeholder="Choose your main degree..."
                            loading={loading}
                        />
                    </div>

                    <div className="cem-section">
                        <label>2. Select Your Course / Stream</label>
                        <SearchableSelect 
                            options={subDegrees}
                            value={selectedSub}
                            onChange={sd => setSelectedSub(sd)}
                            placeholder={selectedMain ? "Choose your course..." : "Select a main category first"}
                            disabled={!selectedMain}
                            loading={selectedMain && subDegrees.length === 0}
                        />
                    </div>
                </div>

                <div className="cem-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button 
                        className="cem-clear-btn" 
                        onClick={handleClear}
                    >
                        View All Courses
                    </button>
                    <button 
                        className="cem-save-btn" 
                        disabled={!selectedMain || !selectedSub} 
                        onClick={handleSave}
                    >
                        Save Preferences <Check size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
