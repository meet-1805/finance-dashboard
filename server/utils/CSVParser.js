const StatementParser = require('./StatementParser');

class CSVParser extends StatementParser {
    async parse(fileBuffer) {
        const content = fileBuffer.toString('utf8');
        const lines = content.split(/\r?\n/);
        if (lines.length < 2) {
            return [];
        }

        // Simple CSV parser logic that handles quotes
        const parseCSVLine = (line) => {
            const result = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result;
        };

        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
        
        // Find column indices
        const dateIdx = headers.indexOf('date');
        const descIdx = headers.indexOf('description');
        const amountIdx = headers.indexOf('amount');
        const typeIdx = headers.indexOf('type');

        if (dateIdx === -1 || descIdx === -1 || amountIdx === -1 || typeIdx === -1) {
            throw new Error("CSV must contain headers: 'Date', 'Description', 'Amount', and 'Type'");
        }

        const transactions = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = parseCSVLine(line);
            if (values.length < headers.length) continue;

            const dateStr = values[dateIdx];
            const descStr = values[descIdx];
            const amountStr = values[amountIdx];
            const typeStr = values[typeIdx];

            const amount = parseFloat(amountStr);
            if (isNaN(amount)) continue;

            // Validate and clean transaction type
            let type = typeStr.trim();
            type = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase(); // Normalize to "Income" or "Expense"
            if (type !== 'Income' && type !== 'Expense') {
                continue;
            }

            const parsedDate = new Date(dateStr);
            if (isNaN(parsedDate.getTime())) {
                continue; // Skip invalid dates
            }

            transactions.push({
                date: parsedDate,
                amount: Math.abs(amount),
                description: descStr,
                type: type
            });
        }

        return transactions;
    }
}

module.exports = CSVParser;
