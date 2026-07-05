import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { API_BASE_URL } from '../../services/api';

interface ImportHistoryRecord {
  _id: string;
  sessionId: string;
  importedCount: number;
  skippedCount: number;
  duplicateCount: number;
  fileType: string;
  parserVersion: string;
  startedAt: string;
  completedAt: string;
  status: 'COMPLETED' | 'ROLLED_BACK';
  rolledBackAt?: string;
  rolledBackBy?: string;
  importedIncomeIds?: string[];
  importedExpenseIds?: string[];
}

@Component({
  selector: 'app-import-history',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './import-history.html',
  styleUrls: ['./import-history.css']
})
export class ImportHistoryComponent implements OnInit {
  private http = inject(HttpClient);

  history: ImportHistoryRecord[] = [];
  isLoading = true;
  errorMessage = '';

  // Detail Modal State
  selectedRecord: ImportHistoryRecord | null = null;

  // Rollback Modal State
  recordToRollback: ImportHistoryRecord | null = null;
  isRollingBack = false;
  successMessage = '';

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.http.get<ImportHistoryRecord[]>(`${API_BASE_URL}/imports/history`).subscribe({
      next: (data) => {
        this.history = data || [];
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Failed to retrieve import history.';
      }
    });
  }

  openDetails(record: ImportHistoryRecord): void {
    this.selectedRecord = record;
  }

  closeDetails(): void {
    this.selectedRecord = null;
  }

  confirmRollback(record: ImportHistoryRecord): void {
    if (record.status === 'ROLLED_BACK') return;
    this.recordToRollback = record;
  }

  closeRollbackModal(): void {
    this.recordToRollback = null;
  }

  executeRollback(): void {
    if (!this.recordToRollback || this.isRollingBack) return;

    this.isRollingBack = true;
    this.errorMessage = '';
    this.successMessage = '';

    const historyId = this.recordToRollback._id;

    this.http.post(`${API_BASE_URL}/imports/history/${historyId}/rollback`, {}).subscribe({
      next: () => {
        this.isRollingBack = false;
        this.recordToRollback = null;
        this.successMessage = 'Import successfully rolled back. Created ledger records deleted.';
        this.loadHistory();
        
        // Clear success notification after 5 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      },
      error: (err) => {
        this.isRollingBack = false;
        this.errorMessage = err.error?.message || 'Rollback failed.';
      }
    });
  }
}
