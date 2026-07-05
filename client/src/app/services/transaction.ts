import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of } from 'rxjs';
import { API_BASE_URL } from './api';

export interface Transaction {
  _id: string;
  title: string;
  amount: number;
  category: string;
  transactionDate: string;
  createdAt?: string;
}

export type TransactionPayload = Omit<Transaction, '_id' | 'createdAt'>;

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private incomeSignal = signal<Transaction[]>([]);
  private expenseSignal = signal<Transaction[]>([]);
  
  private incomeLoaded = false;
  private expensesLoaded = false;

  // Public read-only signals
  public income = this.incomeSignal.asReadonly();
  public expenses = this.expenseSignal.asReadonly();

  constructor(private http: HttpClient) {}

  // Fetch with cache check
  loadIncome(force = false, month?: number | 'all', year?: number): Observable<Transaction[]> {
    if (this.incomeLoaded && !force && month === undefined && year === undefined) {
      return of(this.incomeSignal());
    }
    let params = '';
    if (month !== undefined && year !== undefined) {
      params = `?month=${month}&year=${year}`;
    }
    return this.http.get<Transaction[]>(`${API_BASE_URL}/income${params}`).pipe(
      tap(data => {
        this.incomeSignal.set(data);
        this.incomeLoaded = true;
      })
    );
  }

  // Alias for backward compatibility
  getIncome(): Observable<Transaction[]> {
    return this.loadIncome();
  }

  addIncome(payload: TransactionPayload): Observable<any> {
    return this.http.post<any>(`${API_BASE_URL}/income`, payload).pipe(
      tap(res => {
        if (res && res.income) {
          this.incomeSignal.update(list => [res.income, ...list]);
        }
      })
    );
  }

  updateIncome(id: string, payload: TransactionPayload): Observable<any> {
    return this.http.put<any>(`${API_BASE_URL}/income/${id}`, payload).pipe(
      tap(res => {
        if (res && res.income) {
          this.incomeSignal.update(list =>
            list.map(item => item._id === id ? res.income : item)
          );
        }
      })
    );
  }

  deleteIncome(id: string): Observable<any> {
    return this.http.delete<any>(`${API_BASE_URL}/income/${id}`).pipe(
      tap(() => {
        this.incomeSignal.update(list => list.filter(item => item._id !== id));
      })
    );
  }

  // Fetch with cache check
  loadExpenses(force = false, month?: number | 'all', year?: number): Observable<Transaction[]> {
    if (this.expensesLoaded && !force && month === undefined && year === undefined) {
      return of(this.expenseSignal());
    }
    let params = '';
    if (month !== undefined && year !== undefined) {
      params = `?month=${month}&year=${year}`;
    }
    return this.http.get<Transaction[]>(`${API_BASE_URL}/expenses${params}`).pipe(
      tap(data => {
        this.expenseSignal.set(data);
        this.expensesLoaded = true;
      })
    );
  }

  // Alias for backward compatibility
  getExpenses(): Observable<Transaction[]> {
    return this.loadExpenses();
  }

  addExpense(payload: TransactionPayload): Observable<any> {
    return this.http.post<any>(`${API_BASE_URL}/expenses`, payload).pipe(
      tap(res => {
        if (res && res.expense) {
          this.expenseSignal.update(list => [res.expense, ...list]);
        }
      })
    );
  }

  updateExpense(id: string, payload: TransactionPayload): Observable<any> {
    return this.http.put<any>(`${API_BASE_URL}/expenses/${id}`, payload).pipe(
      tap(res => {
        if (res && res.expense) {
          this.expenseSignal.update(list =>
            list.map(item => item._id === id ? res.expense : item)
          );
        }
      })
    );
  }

  deleteExpense(id: string): Observable<any> {
    return this.http.delete<any>(`${API_BASE_URL}/expenses/${id}`).pipe(
      tap(() => {
        this.expenseSignal.update(list => list.filter(item => item._id !== id));
      })
    );
  }
}
