import React, { useState, useEffect } from 'react';
import { Plus, Minus, HelpCircle } from 'lucide-react';
import api from '../../../../api';
import './faq.scss';

export default function Faq() {
    const [faqsData, setFaqsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openIndex, setOpenIndex] = useState(0);

    useEffect(() => {
        const fetchFaqs = async () => {
            try {
                const res = await api.get("/api/faqs");
                const raw = res.data?.data || res.data || [];
                setFaqsData(Array.isArray(raw) ? raw : []);
            } catch (error) {
                console.error("Failed to fetch FAQs:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchFaqs();
    }, []);

    const toggleAccordion = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    if (loading || faqsData.length === 0) return null;

    return (
        <section className="faq-section">
            <div className="container">

                <div className="section-header wow animate__fadeInUp">
                    <div className="header-badge">
                        <HelpCircle size={16} /> Help Center
                    </div>
                    <h2 className="section-title">Common <span>Questions</span></h2>
                    <p className="section-desc">
                        Find quick answers to common questions about our products,
                        delivery, and study guides.
                    </p>
                </div>

                <div className="faq-list">
                    {faqsData.map((faq, index) => {
                        const isOpen = openIndex === index;
                        return (
                            <div
                                key={index}
                                className={`faq-card wow animate__fadeInUp ${isOpen ? 'active' : ''}`}
                                data-wow-delay={`${index * 0.1}s`}
                                onClick={() => toggleAccordion(index)}
                            >
                                <div className="faq-question">
                                    <h3>{faq.question}</h3>
                                    <div className="toggle-box">
                                        {isOpen ? <Minus size={18} /> : <Plus size={18} />}
                                    </div>
                                </div>

                                <div className={`faq-answer-wrapper ${isOpen ? 'show' : ''}`}>
                                    <div className="faq-answer">
                                        <p>{faq.answer}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

            </div>
        </section>
    );
}
