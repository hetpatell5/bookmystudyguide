/**
 * Global Input Validation Utilities
 * 
 * Enforces strict validation rules for inputs across the application.
 */

export const setupGlobalValidation = () => {

    // 1. KeyDown Listener: Block invalid characters for number inputs
    const handleKeyDown = (e) => {
        const target = e.target;

        // Only apply to <input type="number">
        if (target.tagName === 'INPUT' && target.type === 'number') {

            // Allowed keys: 
            // - Digits (0-9)
            // - Backspace, Delete, Tab, Escape, Enter
            // - Arrow keys, Home, End
            // - Decimal point (.) - ALLOWED for prices
            // - Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X (Copy/Paste/Select)

            const allowedKeys = [
                'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
                'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                'Home', 'End', '.'
            ];

            // Allow Ctrl/Cmd combinations (for Copy/Paste)
            if (e.ctrlKey || e.metaKey) {
                return;
            }

            // Allow standard navigation/editing keys
            if (allowedKeys.includes(e.key)) {
                // Special check for decimal point: allow only one
                if (e.key === '.' && target.value.includes('.')) {
                    e.preventDefault();
                }
                return;
            }

            // Allow digits
            if (/^[0-9]$/.test(e.key)) {
                return;
            }

            // BLOCK EVERYTHING ELSE (Letters, symbols, 'e', '+', '-')
            e.preventDefault();
        }
    };

    // 2. Input Listener: Sanitize pasted values
    const handleInput = (e) => {
        const target = e.target;

        if (target.tagName === 'INPUT' && target.type === 'number') {
            // If the value contains anything other than digits and a single decimal point, clean it.
            // This catches Paste events and Drag-Drop

            const regex = /[^0-9.]/g;
            if (regex.test(target.value)) {
                // Remove invalid chars
                target.value = target.value.replace(regex, '');

                // Ensure only one decimal point
                const parts = target.value.split('.');
                if (parts.length > 2) {
                    target.value = parts[0] + '.' + parts.slice(1).join('');
                }
            }
        }
    };

    // 3. Blur Listener: Trim text inputs
    const handleBlur = (e) => {
        const target = e.target;

        if ((target.tagName === 'INPUT' && target.type === 'text') || target.tagName === 'TEXTAREA') {
            if (typeof target.value === 'string') {
                target.value = target.value.trim();
            }
        }
    };

    // Attach listeners
    document.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    document.addEventListener('input', handleInput, true);
    document.addEventListener('blur', handleBlur, true);

    // Return cleanup function
    return () => {
        document.removeEventListener('keydown', handleKeyDown, true);
        document.removeEventListener('input', handleInput, true);
        document.removeEventListener('blur', handleBlur, true);
    };
};
