import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { CategoryService } from '../../services/category';

interface OnboardingBudget {
  category: string;
  monthlyLimit: number;
}

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.css'
})
export class Onboarding implements OnInit {
  private authService = inject(AuthService);
  private categoryService = inject(CategoryService);
  private router = inject(Router);

  monthlySalary = 0;
  budgets: OnboardingBudget[] = [];

  // Form for adding a single budget
  selectedCategory = '';
  customCategoryName = '';
  isAddingNewCategory = false;
  monthlyLimit = 0;

  availableCategories: string[] = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Housing'];
  errorMessage = '';
  isSubmitting = false;

  ngOnInit(): void {
    // Try to load any existing categories, otherwise fall back to defaults
    this.categoryService.getCategories().subscribe({
      next: (cats) => {
        if (cats && cats.length > 0) {
          this.availableCategories = cats;
        }
      },
      error: (err) => {
        console.error('Failed to load categories', err);
      }
    });
  }

  onCategoryChange() {
    if (this.selectedCategory === '__ADD_NEW__') {
      this.isAddingNewCategory = true;
      this.customCategoryName = '';
    } else {
      this.isAddingNewCategory = false;
    }
  }

  cancelNewCategory() {
    this.isAddingNewCategory = false;
    this.customCategoryName = '';
    this.selectedCategory = '';
  }

  addBudget() {
    this.errorMessage = '';
    const categoryName = this.isAddingNewCategory 
      ? this.customCategoryName.trim() 
      : this.selectedCategory;

    if (!categoryName) {
      this.errorMessage = 'Please select or enter a category name.';
      return;
    }

    if (this.monthlyLimit <= 0) {
      this.errorMessage = 'Monthly limit must be greater than 0.';
      return;
    }

    // Check duplicate
    if (this.budgets.some(b => b.category.toLowerCase() === categoryName.toLowerCase())) {
      this.errorMessage = `A budget for category "${categoryName}" already exists.`;
      return;
    }

    this.budgets.push({
      category: categoryName,
      monthlyLimit: this.monthlyLimit
    });

    // Reset budget form inputs
    this.selectedCategory = '';
    this.customCategoryName = '';
    this.isAddingNewCategory = false;
    this.monthlyLimit = 0;
  }

  removeBudget(index: number) {
    this.budgets.splice(index, 1);
  }

  submitSetup(skipBudgets: boolean) {
    this.errorMessage = '';

    if (this.monthlySalary === null || this.monthlySalary === undefined || this.monthlySalary < 0) {
      this.errorMessage = 'Monthly salary must be a positive number or 0.';
      return;
    }

    this.isSubmitting = true;
    const budgetsPayload = skipBudgets ? [] : this.budgets;

    this.authService.completeOnboarding({
      monthlySalary: this.monthlySalary,
      budgets: budgetsPayload
    }).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Error completing onboarding.';
        this.isSubmitting = false;
      }
    });
  }
}
