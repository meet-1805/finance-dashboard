import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of } from 'rxjs';
import { API_BASE_URL } from './api';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private categorySignal = signal<string[]>([]);
  private categoriesLoaded = false;

  // Public read-only signal representing the categories list state
  public categories = this.categorySignal.asReadonly();

  constructor(private http: HttpClient) {}

  // Fetch with cache check, matching the pattern in BudgetService
  loadCategories(force = false): Observable<string[]> {
    if (this.categoriesLoaded && !force) {
      return of(this.categorySignal());
    }
    return this.http.get<string[]>(`${API_BASE_URL}/categories`).pipe(
      tap(data => {
        this.categorySignal.set(data);
        this.categoriesLoaded = true;
      })
    );
  }

  // Retrieve categories matching getBudgets() pattern
  getCategories(): Observable<string[]> {
    return this.loadCategories();
  }

  // Create a new category without inner subscription. The component can chain the refresh
  createCategory(name: string): Observable<any> {
    return this.http.post<any>(`${API_BASE_URL}/categories`, { name });
  }
}
