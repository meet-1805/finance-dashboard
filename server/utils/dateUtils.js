/**
 * Validates query parameters for month and year.
 * Returns the exact UTC start and end Date objects for the resolved month.
 * If parameters are invalid, returns null.
 * 
 * @param {string|number} queryMonth - The query month parameter (1-12)
 * @param {string|number} queryYear - The query year parameter (e.g. 2026)
 * @returns {{ startOfMonth: Date, endOfMonth: Date }|null}
 */
function getUTCMonthBoundaries(queryMonth, queryYear) {
    const month = parseInt(queryMonth, 10);
    const year = parseInt(queryYear, 10);

    // Strict validation: both must be valid integers, month 1-12, year 1000-9999
    if (
        isNaN(month) || month < 1 || month > 12 ||
        isNaN(year) || year < 1000 || year > 9999
    ) {
        return null;
    }

    // First day of target month at 00:00:00.000 UTC
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));

    // Last day of target month at 23:59:59.999 UTC
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    return { startOfMonth, endOfMonth };
}

module.exports = { getUTCMonthBoundaries };
