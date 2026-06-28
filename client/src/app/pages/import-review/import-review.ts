import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { CategoryService } from '../../services/category';
import { API_BASE_URL } from '../../services/api';

interface ImportTransaction {
  _id: string;
  date: string;
  description: string;
  amount: number;
  type: 'Income' | 'Expense';
  duplicate?: boolean;
  duplicateType?: 'NONE' | 'EXACT' | 'POTENTIAL';
  matchedCollection?: 'Income' | 'Expense';
  matchedRecordId?: string;
  fingerprint?: string;
  suggestedCategory?: string | null;
  confidence?: number;
  categoryStatus?: 'AUTO' | 'REVIEW' | 'UNKNOWN';
  categorizationSource?: 'MERCHANT_MAPPING' | 'USER_HISTORY' | 'KEYWORD' | 'UNKNOWN';
  approved?: boolean;
  finalCategory?: string | null;
  rememberMerchant?: boolean;
}

interface SessionResponse {
  sessionId: string;
  transactionCount: number;
  transactions: ImportTransaction[];
}

@Component({
  selector: 'app-import-review',
  standalone: true,
  imports: [CommonModule, RouterLink, SidebarComponent, FormsModule],
  templateUrl: './import-review.html',
  styleUrls: ['./import-review.css']
})
export class ImportReviewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private categoryService = inject(CategoryService);

  sessionId = '';
  transactions: ImportTransaction[] = [];
  categorizedTransactions: ImportTransaction[] = [];
  needsReviewTransactions: ImportTransaction[] = [];
  categories: string[] = [];
  isLoading = true;
  isSaving = false;
  errorMessage = '';

  totalCount = 0;
  selectedCount = 0;
  skippedCount = 0;
  duplicateCount = 0;
  needsReviewRemaining = 0;

  expandedTransactionId: string | null = null;

  ngOnInit(): void {
    this.sessionId = this.route.snapshot.paramMap.get('sessionId') || '';
    if (!this.sessionId) {
      this.errorMessage = 'No session ID provided.';
      this.isLoading = false;
      return;
    }
    this.loadCategories();
  }

  loadCategories(): void {
    this.categoryService.loadCategories().subscribe({
      next: (cats) => {
        this.categories = cats || [];
        this.loadSessionData();
      },
      error: () => {
        this.categories = ['Food', 'Groceries', 'Transport', 'Entertainment', 'Bills', 'Shopping', 'Salary', 'Investment', 'Other'];
        this.loadSessionData();
      }
    });
  }

  loadSessionData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.http.get<SessionResponse>(`${API_BASE_URL}/imports/session/${this.sessionId}`).subscribe({
      next: (response) => {
        this.transactions = response.transactions || [];
        this.checkDuplicates();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'The import session has expired or does not exist.';
      }
    });
  }

  checkDuplicates(): void {
    this.http.post<SessionResponse>(`${API_BASE_URL}/imports/session/${this.sessionId}/check-duplicates`, {}).subscribe({
      next: (response) => {
        this.transactions = response.transactions || [];
        this.categorizeSession();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Failed to perform duplicate check.';
      }
    });
  }

  categorizeSession(): void {
    this.http.post<SessionResponse>(`${API_BASE_URL}/imports/session/${this.sessionId}/categorize`, {}).subscribe({
      next: (response) => {
        this.transactions = response.transactions || [];

        this.transactions.forEach(tx => {
          tx.approved = !tx.duplicate;
          tx.finalCategory = tx.suggestedCategory || '';
          tx.rememberMerchant = true;
        });

        this.calculateMetrics();
        this.splitTransactions();
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Failed to perform automatic categorization.';
      }
    });
  }

  calculateMetrics(): void {
    this.totalCount = this.transactions.length;
    this.selectedCount = this.transactions.filter(t => t.approved).length;
    this.skippedCount = this.transactions.filter(t => !t.approved).length;
    this.duplicateCount = this.transactions.filter(t => t.duplicate).length;
    
    this.needsReviewRemaining = this.transactions.filter(t => 
      !t.duplicate && t.categoryStatus === 'UNKNOWN' && t.approved && (!t.finalCategory || t.finalCategory.trim() === '')
    ).length;
  }

  splitTransactions(): void {
    this.categorizedTransactions = this.transactions.filter(t => 
      t.duplicate || t.categoryStatus === 'AUTO' || t.categoryStatus === 'REVIEW'
    );
    this.needsReviewTransactions = this.transactions.filter(t => 
      !t.duplicate && t.categoryStatus === 'UNKNOWN'
    );
  }

  toggleRow(tx: ImportTransaction): void {
    if (tx.duplicate) {
      this.expandedTransactionId = this.expandedTransactionId === tx._id ? null : tx._id;
    }
  }

  truncateFingerprint(fp?: string): string {
    if (!fp) return '';
    return fp.slice(0, 16) + '...';
  }

  formatSource(src?: string): string {
    switch (src) {
      case 'MERCHANT_MAPPING': return 'Merchant Mapping';
      case 'USER_HISTORY': return 'User History';
      case 'KEYWORD': return 'Keyword';
      default: return 'Unknown';
    }
  }

  onFieldChange(): void {
    this.calculateMetrics();
  }

  continueToConfirmation(): void {
    if (this.needsReviewRemaining > 0 || this.isSaving) {
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    const learningTxs = this.needsReviewTransactions
      .filter(t => t.approved && t.finalCategory && t.rememberMerchant)
      .map(t => ({
        description: t.description,
        finalCategory: t.finalCategory,
        confirmed: true
      }));

    const executeReview = () => {
      const reviewPayload = {
        transactions: this.transactions.map(t => ({
          sessionTransactionId: t._id,
          approved: t.approved === true,
          finalCategory: t.approved ? t.finalCategory : null
        }))
      };

      this.http.post(`${API_BASE_URL}/imports/session/${this.sessionId}/review`, reviewPayload).subscribe({
        next: () => {
          this.isSaving = false;
          this.router.navigate(['/import/confirm', this.sessionId]);
        },
        error: (err) => {
          this.isSaving = false;
          this.errorMessage = err.error?.message || 'Failed to save transaction review choices.';
        }
      });
    };

    if (learningTxs.length > 0) {
      this.http.post(`${API_BASE_URL}/imports/session/${this.sessionId}/learn`, { transactions: learningTxs }).subscribe({
        next: () => {
          executeReview();
        },
        error: () => {
          executeReview();
        }
      });
    } else {
      executeReview();
    }
  }
}
