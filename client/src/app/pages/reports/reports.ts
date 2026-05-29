import { Component, OnInit, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';

import { TransactionService } from '../../services/transaction';
import { AuthService } from '../../services/auth';
import { SidebarComponent } from '../../components/sidebar/sidebar';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    BaseChartDirective,
    SidebarComponent
  ],
  templateUrl: './reports.html',
  styleUrl: './reports.css'
})
export class Reports implements OnInit {

  private authService = inject(AuthService);
  private transactionService = inject(TransactionService);

  errorMessage = '';

  // Computed totals from cached signals
  totalIncome = computed(() =>
    this.transactionService.income().reduce((sum, i) => sum + Number(i.amount), 0)
  );

  totalExpenses = computed(() =>
    this.transactionService.expenses().reduce((sum, e) => sum + Number(e.amount), 0)
  );

  currentBalance = computed(() => this.totalIncome() - this.totalExpenses());

  // Chart config
  public barChartType: ChartType = 'bar';
  public doughnutChartType: ChartType = 'doughnut';

  public barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: ['Income', 'Expenses', 'Balance'],
    datasets: [{ data: [0, 0, 0], label: 'Finance Overview', backgroundColor: ['#22c55e', '#ef4444', '#3b82f6'] }]
  };

  public categoryChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: [],
    datasets: [{ data: [], backgroundColor: ['#ef4444', '#f59e0b', '#06b6d4', '#8b5cf6', '#14b8a6', '#f97316'] }]
  };

  constructor() {
    // Reactive effect — auto-updates chart data whenever signals change
    effect(() => {
      const incomeTotal = this.totalIncome();
      const expenseTotal = this.totalExpenses();
      const balance = this.currentBalance();

      this.barChartData = {
        labels: ['Income', 'Expenses', 'Balance'],
        datasets: [{
          data: [incomeTotal, expenseTotal, balance],
          label: 'Finance Overview',
          backgroundColor: ['#22c55e', '#ef4444', '#3b82f6']
        }]
      };

      // Build category breakdown from expense signal
      const expenseItems = this.transactionService.expenses();
      const categoryTotals = expenseItems.reduce(
        (totals: Record<string, number>, expense) => {
          const category = expense.category || 'Other';
          totals[category] = (totals[category] || 0) + Number(expense.amount);
          return totals;
        },
        {}
      );

      this.categoryChartData = {
        labels: Object.keys(categoryTotals),
        datasets: [{
          data: Object.values(categoryTotals),
          backgroundColor: ['#ef4444', '#f59e0b', '#06b6d4', '#8b5cf6', '#14b8a6', '#f97316']
        }]
      };
    });
  }

  ngOnInit(): void {
    this.transactionService.loadIncome().subscribe({
      error: (err) => this.errorMessage = err.error?.message || 'Could not load income report data.'
    });
    this.transactionService.loadExpenses().subscribe({
      error: (err) => this.errorMessage = err.error?.message || 'Could not load expense report data.'
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
