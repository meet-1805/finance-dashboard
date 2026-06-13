import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DateStateService {
  private now = new Date();
  
  private monthSignal = signal<number>(this.now.getUTCMonth() + 1); // 1-12
  private yearSignal = signal<number>(this.now.getUTCFullYear());

  public selectedMonth = this.monthSignal.asReadonly();
  public selectedYear = this.yearSignal.asReadonly();

  changeDate(month: number, year: number) {
    this.monthSignal.set(month);
    this.yearSignal.set(year);
  }
}
