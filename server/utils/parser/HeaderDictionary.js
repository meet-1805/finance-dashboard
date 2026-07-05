/**
 * HeaderDictionary
 * 
 * Defines the canonical semantic column types and their known synonyms.
 * 
 * All synonym strings must already be in normalized form (lowercase, no punctuation,
 * single spaces) so they can be compared directly against normalized headers.
 * 
 * To add support for a new bank or language, simply add synonyms to the
 * appropriate semantic type. No parser logic changes are required.
 */
const HEADER_DICTIONARY = {

    DATE: [
        'date',
        'txn date',
        'transaction date',
        'posting date',
        'value date',
        'booking date',
        'tran date',
        'trans date',
        'effective date',
        'settlement date',
        'trade date',
        'entry date',
        'process date',
        'processed date',
        'cleared date',
        'cheque date',
        'check date',
        'payment date',
        'created date',
        'created at'
    ],

    DESCRIPTION: [
        'description',
        'narration',
        'remarks',
        'merchant',
        'particulars',
        'transaction details',
        'transaction description',
        'details',
        'detail',
        'memo',
        'note',
        'notes',
        'reference',
        'reference number',
        'cheque details',
        'payee',
        'beneficiary',
        'sender',
        'transaction narration',
        'transaction remarks',
        'dr cr particulars'
    ],

    DEBIT: [
        'debit',
        'withdrawal',
        'withdrawal amt',
        'withdrawal amount',
        'dr amount',
        'dr amt',
        'dr',
        'paid out',
        'payment',
        'amount debited',
        'debits',
        'money out',
        'withdrawals',
        'expense',
        'expenses'
    ],

    CREDIT: [
        'credit',
        'deposit',
        'deposit amt',
        'deposit amount',
        'cr amount',
        'cr amt',
        'cr',
        'received',
        'money in',
        'credits',
        'amount credited',
        'income',
        'receipts',
        'deposits'
    ],

    BALANCE: [
        'balance',
        'closing balance',
        'running balance',
        'available balance',
        'ledger balance',
        'account balance',
        'net balance',
        'current balance',
        'balance amt',
        'balance amount',
        'closing amt'
    ],

    REFERENCE: [
        'reference',
        'reference number',
        'ref no',
        'ref number',
        'transaction id',
        'transaction number',
        'txn id',
        'txn no',
        'chq no',
        'cheque number',
        'check number',
        'utr',
        'utr number',
        'rrn',
        'approval code'
    ]

};

/**
 * Required semantic columns for a valid import.
 * DATE and DESCRIPTION are always required.
 * At least one of DEBIT or CREDIT must be present.
 */
const REQUIRED_SEMANTICS = ['DATE', 'DESCRIPTION'];
const REQUIRED_ONE_OF = ['DEBIT', 'CREDIT'];

module.exports = {
    HEADER_DICTIONARY,
    REQUIRED_SEMANTICS,
    REQUIRED_ONE_OF
};
