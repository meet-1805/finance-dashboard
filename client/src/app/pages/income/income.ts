import { Component, OnInit, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import {
  Transaction,
  TransactionService
} from '../../services/transaction';
import { DateStateService } from '../../services/date-state';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { MonthSelectorComponent } from '../../components/month-selector/month-selector';

@Component({
  selector: 'app-income',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SidebarComponent,
    MonthSelectorComponent
  ],
  templateUrl: './income.html',
  styleUrl: './income.css'
})
export class Income implements OnInit {

  private authService = inject(AuthService);
  private transactionService = inject(TransactionService);
  private dateStateService = inject(DateStateService);

  title = '';
  amount = 0;
  category = '';
  transactionDate = new Date().toISOString().split('T')[0];
  errorMessage = '';
  editingId = '';

  // Read directly from the cached signal
  get incomeList(): Transaction[] {
    return this.transactionService.income();
  }

  constructor() {
    effect(() => {
      const month = this.dateStateService.selectedMonth();
      const year = this.dateStateService.selectedYear();
      
      this.transactionService.loadIncome(true, month, year).subscribe({
        error: (err) => {
          this.errorMessage = err.error?.message || 'Could not load income.';
        }
      });
    });
  }

  ngOnInit(): void {
  }

  saveIncome() {
    this.errorMessage = '';

    if (!this.title || !this.amount || !this.category) {
      this.errorMessage = 'Title, amount, and category are required.';
      return;
    }

    const incomeData = {
      title: this.title,
      amount: Number(this.amount),
      category: this.category,
      transactionDate: this.transactionDate
    };

    const request = this.editingId
      ? this.transactionService.updateIncome(this.editingId, incomeData)
      : this.transactionService.addIncome(incomeData);

    request.subscribe({
      next: () => {
        this.title = '';
        this.amount = 0;
        this.category = '';
        this.transactionDate = new Date().toISOString().split('T')[0];
        this.editingId = '';
        // No re-fetch needed — signal already updated via tap()
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error saving income.';
      }
    });
  }

  startEdit(income: Transaction): void {
    this.editingId = income._id;
    this.title = income.title;
    this.amount = Number(income.amount);
    this.category = income.category;
    this.transactionDate = income.transactionDate 
      ? new Date(income.transactionDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    this.errorMessage = '';
  }

  cancelEdit(): void {
    this.editingId = '';
    this.title = '';
    this.amount = 0;
    this.category = '';
    this.transactionDate = new Date().toISOString().split('T')[0];
  }

  deleteIncome(id: string) {
    this.transactionService.deleteIncome(id).subscribe({
      next: () => {
        // No re-fetch needed — signal already updated via tap()
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error deleting income.';
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
