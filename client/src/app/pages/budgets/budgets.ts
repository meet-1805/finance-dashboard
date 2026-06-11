import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { Budget, BudgetService } from '../../services/budget';
import { CategoryService } from '../../services/category';
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
  private categoryService = inject(CategoryService);

  category = '';
  categories: string[] = [];
  isAddingNewCategory = false;
  newCategoryName = '';
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
    this.categoryService.getCategories().subscribe({
      next: (cats) => { this.categories = cats; },
      error: (err) => { console.error('Failed to load categories', err); }
    });
  }

  onCategoryChange() {
    if (this.category === '__ADD_NEW__') {
      this.isAddingNewCategory = true;
      this.category = '';
    }
  }

  cancelNewCategory() {
    this.isAddingNewCategory = false;
    this.newCategoryName = '';
    this.category = '';
  }

  saveBudget() {
    this.errorMessage = '';
    const activeCategory = this.isAddingNewCategory ? this.newCategoryName.trim() : this.category;

    if (!activeCategory || !this.monthlyLimit) {
      this.errorMessage = 'Category and monthly limit are required.';
      return;
    }

    if (this.isAddingNewCategory) {
      // Create category first, then create budget
      this.categoryService.createCategory(activeCategory).subscribe({
        next: () => this.executeSaveBudget(activeCategory),
        error: (err) => {
          this.errorMessage = err.error?.message || 'Error creating category.';
        }
      });
    } else {
      this.executeSaveBudget(activeCategory);
    }
  }

  private executeSaveBudget(catName: string) {
    const payload = {
      category: catName,
      monthlyLimit: Number(this.monthlyLimit)
    };

    const request = this.editingId
      ? this.budgetService.updateBudget(this.editingId, { monthlyLimit: payload.monthlyLimit })
      : this.budgetService.addBudget(payload);

    request.subscribe({
      next: () => {
        this.category = '';
        this.newCategoryName = '';
        this.isAddingNewCategory = false;
        this.monthlyLimit = 0;
        this.editingId = '';
        // Refresh categories so new category appears in dropdowns
        this.categoryService.loadCategories(true).subscribe(cats => this.categories = cats);
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
