import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DateStateService } from '../../services/date-state';

@Component({
  selector: 'app-month-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './month-selector.html',
  styleUrl: './month-selector.css'
})
export class MonthSelectorComponent {
  private dateStateService = inject(DateStateService);

  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  years: number[];

  get selectedMonth() {
    return this.dateStateService.selectedMonth;
  }

  get selectedYear() {
    return this.dateStateService.selectedYear;
  }

  constructor() {
    const currentYear = new Date().getUTCFullYear();
    // Dynamically generate years from currentYear - 5 to currentYear + 1
    this.years = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);
  }

  onMonthChange(month: any) {
    this.dateStateService.changeDate(month === 'all' ? 'all' : Number(month), this.selectedYear());
  }

  onYearChange(year: any) {
    this.dateStateService.changeDate(this.selectedMonth(), Number(year));
  }
}
