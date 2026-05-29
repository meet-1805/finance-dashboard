import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import {
  Transaction,
  TransactionService
} from '../../services/transaction';
import { SidebarComponent } from '../../components/sidebar/sidebar';

@Component({
  selector: 'app-income',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SidebarComponent
  ],
  templateUrl: './income.html',
  styleUrl: './income.css'
})
export class Income implements OnInit {

  private authService = inject(AuthService);
  private transactionService = inject(TransactionService);

  title = '';
  amount = 0;
  category = '';
  errorMessage = '';
  editingId = '';

  // Read directly from the cached signal
  get incomeList(): Transaction[] {
    return this.transactionService.income();
  }

  ngOnInit(): void {
    // Trigger initial load — service caches after first call
    this.transactionService.loadIncome().subscribe({
      error: (err) => {
        this.errorMessage = err.error?.message || 'Could not load income.';
      }
    });
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
      category: this.category
    };

    const request = this.editingId
      ? this.transactionService.updateIncome(this.editingId, incomeData)
      : this.transactionService.addIncome(incomeData);

    request.subscribe({
      next: () => {
        this.title = '';
        this.amount = 0;
        this.category = '';
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
    this.errorMessage = '';
  }

  cancelEdit(): void {
    this.editingId = '';
    this.title = '';
    this.amount = 0;
    this.category = '';
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
