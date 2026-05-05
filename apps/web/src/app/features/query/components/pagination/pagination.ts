import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
  selector: 'app-pagination',
  imports: [NgIcon],
  templateUrl: './pagination.html',
  styleUrl: './pagination.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pagination {
  readonly currentPage = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly total = input(0);
  readonly limit = input(10);
  readonly pageChange = output<number>();
  readonly limitChange = output<number>();

  readonly LIMIT_OPTIONS = [10, 25, 50, 100, 0];

  readonly pages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const range: number[] = [];
    const delta = 2;
    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
      range.push(i);
    }
    return range;
  });

  readonly rangeStart = computed(() => (this.currentPage() - 1) * this.limit() + 1);
  readonly rangeEnd = computed(() =>
    this.limit() === 0 ? this.total() : Math.min(this.currentPage() * this.limit(), this.total()),
  );

  go(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) return;
    this.pageChange.emit(page);
  }

  goToPage(input: HTMLInputElement): void {
    const page = parseInt(input.value, 10);
    input.value = '';
    this.go(page);
  }

}
