import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of } from 'rxjs';
import { API_BASE_URL } from './api';

export interface Budget {
  _id: string;
  category: string;
  monthlyLimit: number;
  amountSpent: number;
  remainingBudget: number;
  usagePercentage: number;
  status: 'Normal' | 'Warning' | 'Exceeded';
  createdAt?: string;
}

export interface BudgetPayload {
  category: string;
  monthlyLimit: number;
}

@Injectable({
  providedIn: 'root'
})
export class BudgetService {
  private budgetSignal = signal<Budget[]>([]);
  private budgetsLoaded = false;

  // Public read-only signal
  public budgets = this.budgetSignal.asReadonly();

  constructor(private http: HttpClient) {}

  // Fetch with cache check
  loadBudgets(force = false): Observable<Budget[]> {
    if (this.budgetsLoaded && !force) {
      return of(this.budgetSignal());
    }
    return this.http.get<Budget[]>(`${API_BASE_URL}/budgets`).pipe(
      tap(data => {
        this.budgetSignal.set(data);
        this.budgetsLoaded = true;
      })
    );
  }

  getBudgets(): Observable<Budget[]> {
    return this.loadBudgets();
  }

  addBudget(payload: BudgetPayload): Observable<Budget> {
    return this.http.post<Budget>(`${API_BASE_URL}/budgets`, payload).pipe(
      tap(res => {
        if (res) {
          // Force a reload to get the updated calculations from server
          this.loadBudgets(true).subscribe();
        }
      })
    );
  }

  updateBudget(id: string, payload: { monthlyLimit: number }): Observable<Budget> {
    return this.http.put<Budget>(`${API_BASE_URL}/budgets/${id}`, payload).pipe(
      tap(res => {
        if (res) {
          // Force a reload to get the updated calculations from server
          this.loadBudgets(true).subscribe();
        }
      })
    );
  }

  deleteBudget(id: string): Observable<any> {
    return this.http.delete<any>(`${API_BASE_URL}/budgets/${id}`).pipe(
      tap(() => {
        this.budgetSignal.update(list => list.filter(item => item._id !== id));
      })
    );
  }

  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${API_BASE_URL}/budgets/categories`);
  }
}
