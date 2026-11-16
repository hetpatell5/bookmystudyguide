import React from 'react';
import Faq from '../../home/faq/Faq';
import './faqpage.scss';

export default function FaqPage() {
    return (
        <main className="faq-page-wrapper">
            <div className="faq-hero wow animate__animated animate__fadeIn">
                <div className="container">
                    <h1>How can we help you?</h1>
                    <p>Browse our most frequently asked questions and get the support you need.</p>
                </div>
            </div>

            <div className="faq-content-area">
                <Faq />
            </div>

            <div className="faq-cta wow animate__animated animate__fadeInUp">
                <div className="container">
                    <h3>Still have questions?</h3>
                    <p>If you can't find what you're looking for, our friendly team is here to help.</p>
                    <a href="/contact" className="btn-primary">Contact Support</a>
                </div>
            </div>
        </main>
    );
}
