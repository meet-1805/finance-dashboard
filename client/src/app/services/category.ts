import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, of } from 'rxjs';
import { API_BASE_URL } from './api';

// ── V2 Category shape ────────────────────────────────────────────────────────
export interface CategoryV2 {
  _id: string;
  name: string;
  userId: string | null;
  parentId: string | null;
  categoryType: 'Income' | 'Expense' | 'Transfer' | 'General';
  icon: string;
  colour: string;
  description: string;
  keywords: string[];
  aliases: string[];
  displayOrder: number;
  isDefault: boolean;
  isSystem: boolean;
  isArchived: boolean;
  isActive?: boolean;         // derived from !isArchived for display convenience
  usageCount: number;
  incomeCount: number;
  expenseCount: number;
  children?: CategoryV2[];    // populated when tree=true
  createdAt?: string;
  updatedAt?: string;
}

export type CategoryV2Payload = Pick<
  CategoryV2,
  'name' | 'categoryType' | 'icon' | 'colour' | 'description'
  | 'keywords' | 'aliases' | 'displayOrder'
> & { parentId?: string | null };

// ─────────────────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class CategoryService {

  // ── V1 state (unchanged — all existing callers rely on this) ─────────────
  private categorySignal = signal<string[]>([]);
  private categoriesLoaded = false;

  /** Public read-only signal representing the flat categories list state */
  public categories = this.categorySignal.asReadonly();

  // ── V2 state ──────────────────────────────────────────────────────────────
  private v2Signal = signal<CategoryV2[]>([]);
  private v2Loaded = false;

  /** Public read-only signal for the V2 rich category list */
  public categoriesV2 = this.v2Signal.asReadonly();

  constructor(private http: HttpClient) {}

  // ── V1 API (unchanged signatures — backward compatible) ───────────────────

  /** Fetch with cache check — matches the pattern in BudgetService */
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

  /** Alias for backward compatibility */
  getCategories(): Observable<string[]> {
    return this.loadCategories();
  }

  /** Create a new category — V1 (components can chain the refresh) */
  createCategory(name: string): Observable<any> {
    return this.http.post<any>(`${API_BASE_URL}/categories`, { name });
  }

  // ── V2 API (new, additive) ─────────────────────────────────────────────────

  /**
   * Load all V2 rich categories.
   * @param options.force    bypass cache
   * @param options.tree     return hierarchical tree structure
   * @param options.type     filter by categoryType
   * @param options.search   name/alias/keyword text search
   * @param options.includeArchived  include archived categories
   */
  loadCategoriesV2(options: {
    force?:           boolean;
    tree?:            boolean;
    type?:            'Income' | 'Expense' | 'Transfer' | 'General';
    search?:          string;
    includeArchived?: boolean;
  } = {}): Observable<CategoryV2[]> {
    const { force, tree, type, search, includeArchived } = options;

    // Use cache only for the default (no filters) call
    const useCache = !force && !tree && !type && !search && !includeArchived;
    if (useCache && this.v2Loaded) {
      return of(this.v2Signal());
    }

    let params = new HttpParams();
    if (tree)            params = params.set('tree', 'true');
    if (type)            params = params.set('type', type);
    if (search)          params = params.set('search', search);
    if (includeArchived) params = params.set('includeArchived', 'true');

    return this.http.get<CategoryV2[]>(`${API_BASE_URL}/categories/v2`, { params }).pipe(
      tap(data => {
        if (useCache) {
          this.v2Signal.set(data);
          this.v2Loaded = true;
        }
      })
    );
  }

  /** Get a single V2 category by ID */
  getCategoryByIdV2(id: string): Observable<CategoryV2> {
    return this.http.get<CategoryV2>(`${API_BASE_URL}/categories/v2/${id}`);
  }

  /** Create a new category with full V2 metadata */
  createCategoryV2(payload: CategoryV2Payload): Observable<CategoryV2> {
    return this.http.post<CategoryV2>(`${API_BASE_URL}/categories/v2`, payload).pipe(
      tap(() => { this.v2Loaded = false; })   // invalidate cache
    );
  }

  /** Update a V2 category */
  updateCategoryV2(id: string, payload: Partial<CategoryV2Payload>): Observable<CategoryV2> {
    return this.http.put<CategoryV2>(`${API_BASE_URL}/categories/v2/${id}`, payload).pipe(
      tap(() => { this.v2Loaded = false; })
    );
  }

  /** Archive a category (soft-delete). System categories cannot be archived. */
  archiveCategoryV2(id: string): Observable<any> {
    return this.http.patch<any>(`${API_BASE_URL}/categories/v2/${id}/archive`, {}).pipe(
      tap(() => { this.v2Loaded = false; })
    );
  }

  /** Restore an archived category */
  restoreCategoryV2(id: string): Observable<any> {
    return this.http.patch<any>(`${API_BASE_URL}/categories/v2/${id}/restore`, {}).pipe(
      tap(() => { this.v2Loaded = false; })
    );
  }

  /** Trigger server-side seeding (one-shot, idempotent). */
  triggerSeedV2(): Observable<any> {
    return this.http.post<any>(`${API_BASE_URL}/categories/v2/seed`, {});
  }

  /** Invalidate V2 cache (call after external mutations) */
  invalidateV2Cache(): void {
    this.v2Loaded = false;
  }
}
