/**
 * Validates query parameters for month and year.
 * Returns the exact UTC start and end Date objects for the resolved month or year.
 * If parameters are invalid, returns null.
 * 
 * @param {string|number} queryMonth - The query month parameter (1-12 or 'all')
 * @param {string|number} queryYear - The query year parameter (e.g. 2026)
 * @returns {{ startOfPeriod: Date, endOfPeriod: Date }|null}
 */
function getUTCMonthBoundaries(queryMonth, queryYear) {
    const year = parseInt(queryYear, 10);
    if (isNaN(year) || year < 1000 || year > 9999) {
        return null;
    }

    if (queryMonth === 'all') {
        const startOfPeriod = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
        const endOfPeriod = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
        return { startOfPeriod, endOfPeriod };
    }

    const month = parseInt(queryMonth, 10);
    if (isNaN(month) || month < 1 || month > 12) {
        return null;
    }

    // First day of target month at 00:00:00.000 UTC
    const startOfPeriod = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));

    // Last day of target month at 23:59:59.999 UTC
    const endOfPeriod = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    return { startOfPeriod, endOfPeriod };
}

module.exports = { getUTCMonthBoundaries };
