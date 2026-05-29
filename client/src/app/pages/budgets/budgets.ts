import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { Budget, BudgetService } from '../../services/budget';
import { SidebarComponent } from '../../components/sidebar/sidebar';

@Component({
  selector: 'app-budgets',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SidebarComponent
  ],
  templateUrl: './budgets.html',
  styleUrl: './budgets.css'
})
export class Budgets implements OnInit {
  private authService = inject(AuthService);
  private budgetService = inject(BudgetService);

  category = '';
  monthlyLimit = 0;
  errorMessage = '';
  editingId = '';

  get budgets(): Budget[] {
    return this.budgetService.budgets();
  }

  ngOnInit(): void {
    this.budgetService.loadBudgets().subscribe({
      error: (err) => {
        this.errorMessage = err.error?.message || 'Could not load budgets.';
      }
    });
  }

  saveBudget() {
    this.errorMessage = '';

    if (!this.category || !this.monthlyLimit) {
      this.errorMessage = 'Category and monthly limit are required.';
      return;
    }

    const payload = {
      category: this.category,
      monthlyLimit: Number(this.monthlyLimit)
    };

    const request = this.editingId
      ? this.budgetService.updateBudget(this.editingId, { monthlyLimit: payload.monthlyLimit })
      : this.budgetService.addBudget(payload);

    request.subscribe({
      next: () => {
        this.category = '';
        this.monthlyLimit = 0;
        this.editingId = '';
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error saving budget.';
      }
    });
  }

  startEdit(budget: Budget): void {
    this.editingId = budget._id;
    this.category = budget.category;
    this.monthlyLimit = Number(budget.monthlyLimit);
    this.errorMessage = '';
  }

  cancelEdit(): void {
    this.editingId = '';
    this.category = '';
    this.monthlyLimit = 0;
  }

  deleteBudget(id: string) {
    this.budgetService.deleteBudget(id).subscribe({
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error deleting budget.';
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
