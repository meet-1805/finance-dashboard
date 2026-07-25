import {
  Component, OnInit, inject, signal, computed, ChangeDetectorRef
} from '@angular/core';
import { CommonModule }     from '@angular/common';
import { FormsModule }      from '@angular/forms';

import { SidebarComponent } from '../../components/sidebar/sidebar';
import { CategoryService, CategoryV2, CategoryV2Payload } from '../../services/category';

type ViewMode = 'list' | 'tree';
type FilterType = 'All' | 'Income' | 'Expense' | 'Transfer' | 'General';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './categories.html',
  styleUrls: ['./categories.css']
})
export class CategoriesPage implements OnInit {
  private categoryService = inject(CategoryService);
  private cdr             = inject(ChangeDetectorRef);

  // ── View state ─────────────────────────────────────────────────────────────
  viewMode: ViewMode    = 'list';
  filterType: FilterType = 'All';
  searchQuery           = '';
  showArchived          = false;
  isLoading             = true;
  errorMessage          = '';
  successMessage        = '';

  // ── Data ───────────────────────────────────────────────────────────────────
  allCategories: CategoryV2[] = [];

  // ── Form state ─────────────────────────────────────────────────────────────
  showCreateForm  = false;
  showEditForm    = false;
  editingCategory: CategoryV2 | null = null;

  form: CategoryV2Payload & { _id?: string } = this.blankForm();

  // ── Icon picker options ────────────────────────────────────────────────────
  readonly ICONS = [
    '📂','🍽️','🚗','🏠','💡','🏥','📚','🛍️','🎬','💅',
    '🏦','✈️','🎁','💼','📈','💹','🏘️','💰','🔄','🏧',
    '🛒','🍴','☕','🍔','🛵','⛽','🚌','🅿️','🛣️','🔧',
    '🏡','💊','🎓','📖','💻','👕','📱','🏋️','💇','🎮',
    '🎟️','📋','💳','📊'
  ];

  // ── Colour palette ─────────────────────────────────────────────────────────
  readonly COLOURS = [
    '#EF4444','#F97316','#F59E0B','#22C55E','#10B981',
    '#0EA5E9','#3B82F6','#6366F1','#8B5CF6','#EC4899',
    '#6B7280','#A855F7','#14B8A6','#F472B6','#16A34A'
  ];

  readonly CATEGORY_TYPES: FilterType[] = ['Income', 'Expense', 'Transfer', 'General'];

  // ── Computed filtered list ─────────────────────────────────────────────────
  get filtered(): CategoryV2[] {
    let list = this.allCategories;

    if (!this.showArchived) list = list.filter(c => !c.isArchived);
    if (this.filterType !== 'All') list = list.filter(c => c.categoryType === this.filterType);

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.aliases  || []).some(a => a.toLowerCase().includes(q)) ||
        (c.keywords || []).some(k => k.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
  }

  // Group for tree view by parentId
  get roots(): CategoryV2[]  { return this.filtered.filter(c => !c.parentId); }
  childrenOf(id: string): CategoryV2[] {
    return this.filtered.filter(c => c.parentId === id);
  }
  hasChildren(id: string): boolean { return this.childrenOf(id).length > 0; }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.categoryService.loadCategoriesV2({ force: true, includeArchived: this.showArchived }).subscribe({
      next: cats => {
        this.allCategories = cats;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.errorMessage = err.error?.message || 'Failed to load categories.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  openCreate(): void {
    this.form = this.blankForm();
    this.showCreateForm = true;
    this.showEditForm   = false;
    this.editingCategory = null;
  }

  openEdit(cat: CategoryV2): void {
    if (cat.isSystem) {
      // System categories allow only non-structural edits
      this.form = {
        name:         cat.name,
        categoryType: cat.categoryType,
        icon:         cat.icon,
        colour:       cat.colour,
        description:  cat.description,
        keywords:     [...cat.keywords],
        aliases:      [...cat.aliases],
        displayOrder: cat.displayOrder,
        parentId:     cat.parentId
      };
    } else {
      this.form = {
        name:         cat.name,
        categoryType: cat.categoryType,
        icon:         cat.icon,
        colour:       cat.colour,
        description:  cat.description,
        keywords:     [...cat.keywords],
        aliases:      [...cat.aliases],
        displayOrder: cat.displayOrder,
        parentId:     cat.parentId
      };
    }
    this.editingCategory = cat;
    this.showEditForm    = true;
    this.showCreateForm  = false;
  }

  closeForm(): void {
    this.showCreateForm  = false;
    this.showEditForm    = false;
    this.editingCategory = null;
  }

  saveCreate(): void {
    if (!this.form.name?.trim()) { this.errorMessage = 'Name is required.'; return; }
    this.errorMessage = '';

    const payload: CategoryV2Payload = {
      name:         this.form.name.trim(),
      categoryType: this.form.categoryType,
      icon:         this.form.icon,
      colour:       this.form.colour,
      description:  this.form.description,
      keywords:     this.parseList(this.keywordsRaw),
      aliases:      this.parseList(this.aliasesRaw),
      displayOrder: this.form.displayOrder,
      parentId:     this.form.parentId || null
    };

    this.categoryService.createCategoryV2(payload).subscribe({
      next: () => { this.flash('Category created!'); this.closeForm(); this.load(); },
      error: err => { this.errorMessage = err.error?.message || 'Create failed.'; this.cdr.detectChanges(); }
    });
  }

  saveEdit(): void {
    if (!this.editingCategory) return;
    this.errorMessage = '';

    const payload: Partial<CategoryV2Payload> = {
      categoryType: this.form.categoryType,
      icon:         this.form.icon,
      colour:       this.form.colour,
      description:  this.form.description,
      keywords:     this.parseList(this.keywordsRaw),
      aliases:      this.parseList(this.aliasesRaw),
      displayOrder: this.form.displayOrder,
      parentId:     this.form.parentId || null
    };

    if (!this.editingCategory.isSystem) {
      payload.name = this.form.name?.trim();
    }

    this.categoryService.updateCategoryV2(this.editingCategory._id, payload).subscribe({
      next: () => { this.flash('Category updated!'); this.closeForm(); this.load(); },
      error: err => { this.errorMessage = err.error?.message || 'Update failed.'; this.cdr.detectChanges(); }
    });
  }

  archiveCategory(cat: CategoryV2): void {
    if (cat.isSystem) return;
    this.categoryService.archiveCategoryV2(cat._id).subscribe({
      next: () => { this.flash('Category archived.'); this.load(); },
      error: err => { this.errorMessage = err.error?.message || 'Archive failed.'; this.cdr.detectChanges(); }
    });
  }

  restoreCategory(cat: CategoryV2): void {
    this.categoryService.restoreCategoryV2(cat._id).subscribe({
      next: () => { this.flash('Category restored.'); this.load(); },
      error: err => { this.errorMessage = err.error?.message || 'Restore failed.'; this.cdr.detectChanges(); }
    });
  }

  triggerSeed(): void {
    this.categoryService.triggerSeedV2().subscribe({
      next: (r) => { this.flash(r.message || 'Seed triggered. Check server logs.'); this.load(); },
      error: err => { this.errorMessage = err.error?.message || 'Seed failed.'; this.cdr.detectChanges(); }
    });
  }

  // ── Tag-input helpers ──────────────────────────────────────────────────────
  keywordsRaw = '';
  aliasesRaw  = '';

  populateRaw(cat: CategoryV2): void {
    this.keywordsRaw = (cat.keywords || []).join(', ');
    this.aliasesRaw  = (cat.aliases  || []).join(', ');
  }

  openEditWithRaw(cat: CategoryV2): void {
    this.openEdit(cat);
    this.populateRaw(cat);
  }

  parseList(raw: string): string[] {
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  }

  // ── Utilities ──────────────────────────────────────────────────────────────

  typeClass(type: string): string {
    const map: Record<string, string> = {
      'Income': 'badge-income', 'Expense': 'badge-expense',
      'Transfer': 'badge-transfer', 'General': 'badge-general'
    };
    return map[type] || 'badge-general';
  }

  private flash(msg: string): void {
    this.successMessage = msg;
    this.cdr.detectChanges();
    setTimeout(() => { this.successMessage = ''; this.cdr.detectChanges(); }, 3000);
  }

  private blankForm(): CategoryV2Payload {
    this.keywordsRaw = '';
    this.aliasesRaw  = '';
    return {
      name: '', categoryType: 'General', icon: '📂', colour: '#6B7280',
      description: '', keywords: [], aliases: [], displayOrder: 0, parentId: null
    };
  }

  parentOptions(): CategoryV2[] {
    // Only root (non-archived) categories can be parents to avoid deep nesting
    return this.allCategories.filter(c => !c.parentId && !c.isArchived);
  }
}
