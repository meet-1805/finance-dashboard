/**
 * AmountNormalizer
 *
 * Parses monetary amount strings from bank statements into reliable floats,
 * handling the full range of real-world formatting variants:
 *
 *   Supported formats:
 *   ─────────────────────────────────────────────────────────────────────
 *   1,234.56         Comma thousands-separator, dot decimal (standard)
 *   1.234,56         Dot thousands-separator, comma decimal (European)
 *   1 234.56         Space thousands-separator
 *   ₹1,234.56        With currency prefix symbol
 *   1,234.56 USD     With currency suffix code
 *   -1,234.56        Negative: leading minus
 *   1,234.56-        Negative: trailing minus
 *   (1,234.56)       Negative: parenthesized (accounting style)
 *   1234             Integer, no separators
 *   1,234            Ambiguous (treated as integer with comma separator)
 *
 *   Currency symbols stripped:
 *   ₹ $ € £ ¥ ₩ ₫ ₦ ฿ ₡ ₱ ₲ ₳ ₴ ₵ ₺ ₼ ₽ ₾ kr CHF Rs
 *
 * Returns:
 *   { value: number, isNegative: boolean }
 *   or { value: 0, isNegative: false } for empty / unparseable input.
 */
class AmountNormalizer {

    // All currency symbols and codes to strip
    static CURRENCY_PATTERN = /(?:₹|R[sS]\.?|\$|€|£|¥|₩|₫|₦|฿|₡|₱|₲|₳|₴|₵|₺|₼|₽|₾|CHF|kr|AED|AUD|CAD|CNY|HKD|INR|JPY|MYR|NZD|SGD|USD|GBP|EUR)\s*/gi;

    /**
     * Normalise a raw amount string.
     * @param {string} raw
     * @returns {{ value: number, isNegative: boolean }}
     */
    static normalize(raw) {
        if (!raw || typeof raw !== 'string') return { value: 0, isNegative: false };

        let str = raw.trim();
        if (!str) return { value: 0, isNegative: false };

        let isNegative = false;

        // ── Step 1: Detect and remove parenthesized negatives ──────────────
        if (/^\(.*\)$/.test(str)) {
            isNegative = true;
            str = str.slice(1, -1).trim();
        }

        // ── Step 2: Strip currency symbols and codes ────────────────────────
        str = str.replace(AmountNormalizer.CURRENCY_PATTERN, '').trim();

        // ── Step 3: Detect sign from leading/trailing minus ─────────────────
        if (str.startsWith('-')) {
            isNegative = true;
            str = str.slice(1).trim();
        }
        if (str.endsWith('-')) {
            isNegative = true;
            str = str.slice(0, -1).trim();
        }

        // ── Step 4: Remove remaining whitespace ─────────────────────────────
        str = str.replace(/\s/g, '');

        if (!str) return { value: 0, isNegative: false };

        // ── Step 5: Resolve decimal / thousands separators ──────────────────
        //
        // We distinguish three cases by the separators present:
        //
        //  A) 1,234,567.89 or 1,234.56  → comma = thousands, dot = decimal
        //  B) 1.234.567,89 or 1.234,56  → dot = thousands,   comma = decimal
        //  C) 1234567       or 1234.56  → no ambiguity
        //
        const hasComma = str.includes(',');
        const hasDot   = str.includes('.');

        if (hasComma && hasDot) {
            const lastComma = str.lastIndexOf(',');
            const lastDot   = str.lastIndexOf('.');

            if (lastDot > lastComma) {
                // e.g. 1,234.56  → comma = thousands
                str = str.replace(/,/g, '');
            } else {
                // e.g. 1.234,56  → dot = thousands, comma = decimal
                str = str.replace(/\./g, '').replace(',', '.');
            }
        } else if (hasComma && !hasDot) {
            // e.g. 1,234,567 or 1,234 or 1,56 (European decimal)
            // If comma appears more than once → thousands separator
            const commaCount = (str.match(/,/g) || []).length;
            if (commaCount > 1) {
                // Definitely thousands: 1,234,567
                str = str.replace(/,/g, '');
            } else {
                // Single comma: ambiguous.
                // Heuristic: if digits after comma ≠ 2 or 3, treat as thousands
                const afterComma = str.split(',')[1] || '';
                if (afterComma.length === 2) {
                    // Likely European decimal: 1234,56 → 1234.56
                    str = str.replace(',', '.');
                } else {
                    // Likely thousands: 1,234 or 1,000
                    str = str.replace(/,/g, '');
                }
            }
        } else if (hasDot && !hasComma) {
            // Standard dot decimal: 1234.56 or 1234567.00 — keep as-is
            // But handle repeated dots (thousands): 1.234.567
            const dotCount = (str.match(/\./g) || []).length;
            if (dotCount > 1) {
                // Multiple dots = thousands separator (European style)
                str = str.replace(/\./g, '');
            }
            // Single dot: standard decimal, keep as-is
        }
        // No separators at all — plain integer, keep as-is

        const value = parseFloat(str);
        if (isNaN(value)) return { value: 0, isNegative: false };

        return { value: Math.abs(value), isNegative };
    }

    /**
     * Parse a raw amount string into a signed float.
     * Negatives return a negative number.
     * @param {string} raw
     * @returns {number}
     */
    static parse(raw) {
        const { value, isNegative } = AmountNormalizer.normalize(raw);
        return isNegative ? -value : value;
    }

    /**
     * Parse a raw amount string into an unsigned (absolute) float.
     * @param {string} raw
     * @returns {number}
     */
    static parseAbsolute(raw) {
        return AmountNormalizer.normalize(raw).value;
    }
}

module.exports = AmountNormalizer;
