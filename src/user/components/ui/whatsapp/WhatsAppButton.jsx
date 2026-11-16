import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { FaWhatsapp } from "react-icons/fa";
import api from "../../../api";
import "./WhatsAppButton.scss";

const WhatsAppButton = () => {
    const [contact, setContact] = useState(null);
    const location = useLocation();

    useEffect(() => {
        api.get("/api/contact").then((res) => {
            if (res.data) setContact(res.data);
        });
    }, []);

    if (!contact || !contact.whatsapp) {
        return null;
    }

    const whatsappNumber = contact.whatsapp.replace(/\s+/g, "");
    const defaultMessage = encodeURIComponent("Hello BMSG, I have a query regarding the study materials.");

    return (
        <a
            href={`https://wa.me/${whatsappNumber}?text=${defaultMessage}`}
            className="whatsapp-float-btn"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat with us on WhatsApp"
        >
            <div className="whatsapp-icon-wrapper">
                <FaWhatsapp />
            </div>
            <span className="whatsapp-tooltip">Chat with us</span>
        </a>
    );
};

export default WhatsAppButton;
