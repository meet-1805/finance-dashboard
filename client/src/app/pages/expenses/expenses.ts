import { Component, OnInit, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import {
  Transaction,
  TransactionService
} from '../../services/transaction';
import { BudgetService } from '../../services/budget';
import { DateStateService } from '../../services/date-state';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { MonthSelectorComponent } from '../../components/month-selector/month-selector';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SidebarComponent,
    MonthSelectorComponent
  ],
  templateUrl: './expenses.html',
  styleUrl: './expenses.css'
})
export class Expenses implements OnInit {

  private authService = inject(AuthService);
  private transactionService = inject(TransactionService);
  private budgetService = inject(BudgetService);
  private dateStateService = inject(DateStateService);

  title = '';
  amount = 0;
  category = '';
  categories: string[] = [];
  errorMessage = '';
  editingId = '';

  // Read directly from the cached signal
  get expenses(): Transaction[] {
    return this.transactionService.expenses();
  }

  constructor() {
    effect(() => {
      const month = this.dateStateService.selectedMonth();
      const year = this.dateStateService.selectedYear();
      
      this.transactionService.loadExpenses(true, month, year).subscribe({
        error: (err) => {
          this.errorMessage = err.error?.message || 'Could not load expenses.';
        }
      });
    });
  }

  ngOnInit(): void {
    // Load dynamic categories
    this.budgetService.getCategories().subscribe({
      next: (cats) => {
        this.categories = cats;
      },
      error: (err) => {
        console.error('Failed to load categories', err);
      }
    });
  }

  saveExpense() {
    this.errorMessage = '';

    if (!this.title || !this.amount || !this.category) {
      this.errorMessage = 'Title, amount, and category are required.';
      return;
    }

    const expenseData = {
      title: this.title,
      amount: Number(this.amount),
      category: this.category
    };

    const request = this.editingId
      ? this.transactionService.updateExpense(this.editingId, expenseData)
      : this.transactionService.addExpense(expenseData);

    request.subscribe({
      next: () => {
        this.title = '';
        this.amount = 0;
        this.category = '';
        this.editingId = '';
        // No re-fetch needed — signal already updated via tap()
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error saving expense.';
      }
    });
  }

  startEdit(expense: Transaction): void {
    this.editingId = expense._id;
    this.title = expense.title;
    this.amount = Number(expense.amount);
    this.category = expense.category;
    this.errorMessage = '';
  }

  cancelEdit(): void {
    this.editingId = '';
    this.title = '';
    this.amount = 0;
    this.category = '';
  }

  deleteExpense(id: string) {
    this.transactionService.deleteExpense(id).subscribe({
      next: () => {
        // No re-fetch needed — signal already updated via tap()
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error deleting expense.';
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
