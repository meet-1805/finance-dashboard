import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { API_BASE_URL } from '../../services/api';

interface ImportTransaction {
  _id: string;
  amount: number;
  type: 'Income' | 'Expense';
  duplicate?: boolean;
  approved?: boolean;
  finalCategory?: string | null;
  categoryStatus?: string;
}

interface SessionResponse {
  sessionId: string;
  transactions: ImportTransaction[];
}

interface ConfirmResponse {
  message: string;
  summary: {
    totalTransactions: number;
    importedCount: number;
    skippedCount: number;
    duplicateCount: number;
    incomeCount: number;
    expenseCount: number;
  };
  historyId: string;
}

@Component({
  selector: 'app-import-confirm',
  standalone: true,
  imports: [CommonModule, RouterLink, SidebarComponent],
  templateUrl: './import-confirm.html',
  styleUrls: ['./import-confirm.css']
})
export class ImportConfirmComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  sessionId = '';
  isLoading = true;
  isImporting = false;
  errorMessage = '';
  isSuccess = false;

  // Session Statistics
  totalCount = 0;
  importCount = 0;
  skippedCount = 0;
  duplicateCount = 0;
  learnedCount = 0;
  estimatedIncome = 0;
  estimatedExpense = 0;

  // Import results
  importResult: ConfirmResponse['summary'] | null = null;
  historyId = '';

  ngOnInit(): void {
    this.sessionId = this.route.snapshot.paramMap.get('sessionId') || '';
    if (!this.sessionId) {
      this.errorMessage = 'No session ID provided.';
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }
    this.loadSessionData();
  }

  loadSessionData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.http.get<SessionResponse>(`${API_BASE_URL}/imports/session/${this.sessionId}`).subscribe({
      next: (response) => {
        try {
          const transactions = response.transactions || [];
          this.calculateMetrics(transactions);
          
          this.isLoading = false;
          this.cdr.detectChanges();
        } catch (err) {
          console.error('[ImportConfirm] UNCAUGHT ERROR in next', err);
        }
      },
      error: (error) => {
        try {
          this.isLoading = false;
          this.cdr.detectChanges();
          this.errorMessage = error.error?.message || 'Failed to load confirmation details. Session may have expired.';
        } catch (err) {
          console.error('[ImportConfirm] UNCAUGHT ERROR in error', err);
        }
      }
    });
  }

  calculateMetrics(transactions: ImportTransaction[]): void {
    try {
      this.totalCount = transactions.length;
      this.importCount = transactions.filter(t => t.approved && !t.duplicate).length;
      this.skippedCount = transactions.filter(t => !t.approved && !t.duplicate).length;
      this.duplicateCount = transactions.filter(t => t.duplicate).length;
      
      this.learnedCount = transactions.filter(t => 
        !t.duplicate && t.approved && t.categoryStatus === 'UNKNOWN' && t.finalCategory
      ).length;

      this.estimatedIncome = transactions
        .filter(t => t.approved && !t.duplicate && t.type === 'Income')
        .reduce((sum, t) => sum + t.amount, 0);

      this.estimatedExpense = transactions
        .filter(t => t.approved && !t.duplicate && t.type === 'Expense')
        .reduce((sum, t) => sum + t.amount, 0);
    } catch (err) {
      console.error('[ImportConfirm] UNCAUGHT ERROR in calculateMetrics', err);
    }
  }

  executeImport(): void {
    if (this.isImporting) {
      return;
    }

    this.isImporting = true;
    this.errorMessage = '';

    this.http.post<ConfirmResponse>(`${API_BASE_URL}/imports/confirm`, { sessionId: this.sessionId }).subscribe({
      next: (response) => {
        try {
          this.isImporting = false;
          this.isSuccess = true;
          this.importResult = response.summary;
          this.historyId = response.historyId;
          this.cdr.detectChanges();
        } catch (err) {
          console.error('[ImportConfirm] UNCAUGHT ERROR in executeImport next', err);
        }
      },
      error: (error) => {
        try {
          this.isImporting = false;
          this.errorMessage = error.error?.message || 'Failed to complete transaction import.';
          this.cdr.detectChanges();
        } catch (err) {
          console.error('[ImportConfirm] UNCAUGHT ERROR in executeImport error', err);
        }
      }
    });
  }
}
