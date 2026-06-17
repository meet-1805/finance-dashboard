import { Component, OnInit, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';
import { TransactionService } from '../../services/transaction';
import { DateStateService } from '../../services/date-state';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { MonthSelectorComponent } from '../../components/month-selector/month-selector';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    SidebarComponent,
    MonthSelectorComponent
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {

  private authService = inject(AuthService);
  private transactionService = inject(TransactionService);
  private dateStateService = inject(DateStateService);

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

  // Hardcoded as placeholder per requirements
  private readonly baseMonthlySalary = 50000;

  salaryReferenceLabel = computed(() => 
    this.dateStateService.selectedMonth() === 'all' ? 'Yearly Salary Reference' : 'Monthly Salary Reference'
  );

  salaryReferenceValue = computed(() => 
    this.dateStateService.selectedMonth() === 'all' ? this.baseMonthlySalary * 12 : this.baseMonthlySalary
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

  constructor() {
    effect(() => {
      const month = this.dateStateService.selectedMonth();
      const year = this.dateStateService.selectedYear();
      
      this.transactionService.loadIncome(true, month, year).subscribe({
        error: (err) => this.errorMessage = err.error?.message || 'Could not load income.'
      });
      this.transactionService.loadExpenses(true, month, year).subscribe({
        error: (err) => this.errorMessage = err.error?.message || 'Could not load expenses.'
      });
    });
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) this.userName = user.name;
  }
}
