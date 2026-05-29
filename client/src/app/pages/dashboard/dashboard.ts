import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';
import { TransactionService } from '../../services/transaction';
import { SidebarComponent } from '../../components/sidebar/sidebar';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    SidebarComponent
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {

  private authService = inject(AuthService);
  private transactionService = inject(TransactionService);

  userName = 'User';
  errorMessage = '';

  // Computed signals — auto-update when income/expense signals change
  totalIncome = computed(() =>
    this.transactionService.income().reduce((sum, i) => sum + Number(i.amount), 0)
  );

  totalExpenses = computed(() =>
    this.transactionService.expenses().reduce((sum, e) => sum + Number(e.amount), 0)
  );

  currentBalance = computed(() => this.totalIncome() - this.totalExpenses());

  totalTransactions = computed(() =>
    this.transactionService.income().length + this.transactionService.expenses().length
  );

  recentTransactions = computed(() => {
    const income = this.transactionService.income().map(i => ({ ...i, type: 'Income' as const }));
    const expenses = this.transactionService.expenses().map(e => ({ ...e, type: 'Expense' as const }));
    return [...income, ...expenses]
      .sort((a, b) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      )
      .slice(0, 5);
  });

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) this.userName = user.name;

    // Trigger initial load — service caches after first call
    this.transactionService.loadIncome().subscribe({
      error: (err) => this.errorMessage = err.error?.message || 'Could not load income.'
    });
    this.transactionService.loadExpenses().subscribe({
      error: (err) => this.errorMessage = err.error?.message || 'Could not load expenses.'
    });
  }
}
