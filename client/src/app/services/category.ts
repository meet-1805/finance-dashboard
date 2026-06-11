import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of } from 'rxjs';
import { API_BASE_URL } from './api';

export interface Category {
  _id?: string;
  name: string;
  isDefault?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private categorySignal = signal<string[]>([]);
  private categoriesLoaded = false;

  public categories = this.categorySignal.asReadonly();

  constructor(private http: HttpClient) {}

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

  getCategories(): Observable<string[]> {
    return this.loadCategories();
  }

  createCategory(name: string): Observable<Category> {
    return this.http.post<Category>(`${API_BASE_URL}/categories`, { name }).pipe(
      tap(res => {
        if (res && res.name) {
          this.categorySignal.update(list => {
            const updated = [...list];
            if (!updated.includes(res.name)) {
              updated.push(res.name);
              updated.sort((a, b) => a.localeCompare(b));
            }
            return updated;
          });
        }
      })
    );
  }
}
