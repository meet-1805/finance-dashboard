import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { API_BASE_URL } from '../../services/api';

@Component({
  selector: 'app-import',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './import.html',
  styleUrls: ['./import.css']
})
export class ImportComponent {
  private http = inject(HttpClient);
  private router = inject(Router);

  selectedFile: File | null = null;
  isLoading = false;
  errorMessage = '';

  onFileSelected(event: any): void {
    this.errorMessage = '';
    const file = event.target.files[0];
    if (file) {
      if (file.name.toLowerCase().endsWith('.csv')) {
        this.selectedFile = file;
      } else {
        this.selectedFile = null;
        this.errorMessage = 'Please select a valid CSV file (.csv).';
      }
    }
  }

  uploadStatement(): void {
    if (!this.selectedFile) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const formData = new FormData();
    formData.append('statement', this.selectedFile);

    this.http.post<any>(`${API_BASE_URL}/imports/upload`, formData).subscribe({
      next: (response) => {
        this.isLoading = false;

        if (response.status === 'MAPPING_REQUIRED') {
          const missing = (response.missingSemantics || []).join(', ');
          this.errorMessage =
            `Your CSV uses unrecognised column names. ` +
            `Could not detect: ${missing}. ` +
            `Please ensure your file has columns for Date, Description, and Debit or Credit amounts.`;
          return;
        }

        // SUCCESS — navigate to review
        this.router.navigate(['/import/review', response.sessionId]);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Upload failed. Please try again.';
      }
    });
  }
}
