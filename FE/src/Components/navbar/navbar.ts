import { Component, DestroyRef, ElementRef, OnDestroy, OnInit, computed, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subject, catchError, debounceTime, distinctUntilChanged, filter, map, of, switchMap, tap } from 'rxjs';
import { CartService } from '../../Services/Cart';
import { AuthService } from '../../Services/auth';
import { WishlistService } from '../../Services/wishlist';
import { MenuCategory, ProductService, Suggestion } from '../../Services/product';


@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, CurrencyPipe],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
  host: { '(window:resize)': 'updateArrows()' },
})
export class Navbar implements OnInit, OnDestroy {
  cart = inject(CartService);
  auth = inject(AuthService);
  wishlist = inject(WishlistService);
  private router = inject(Router);
  private productService = inject(ProductService);
  private destroyRef = inject(DestroyRef);

  // ---------- search box ----------
  query = signal('');
  suggestions = signal<Suggestion[]>([]);
  suggestLoading = signal(false);
  showSuggest = signal(false);
  /** keyboard-highlighted suggestion (-1 = none) */
  activeIdx = signal(-1);
  /** dropdown shows once 2+ letters are typed and the box is focused */
  suggestOpen = computed(() => this.showSuggest() && this.query().trim().length >= 2);
  private typed$ = new Subject<string>();

  /** categories + their subcategories (/category_menu) */
  menu = signal<MenuCategory[]>([]);
  /** category whose menu is open (mouse is over it) */
  openId = signal<string | null>(null);
  openCategory = computed(() => this.menu().find((c) => c._id === this.openId()) ?? null);
  private timer?: ReturnType<typeof setTimeout>;

  /** category bar slider */
  catList = viewChild<ElementRef<HTMLElement>>('catList');
  canLeft = signal(false);
  canRight = signal(false);

  constructor() {
    // whenever the login state changes: load the cart + wishlist for users, empty it otherwise
    effect(() => {
      if (this.auth.isUser()) {
        this.cart.load().subscribe({ error: () => this.cart.reset() });
        this.wishlist.load().subscribe({ error: () => this.wishlist.reset() });
      } else {
        this.cart.reset();
        this.wishlist.reset();
      }
    });
  }

  ngOnInit() {
    // typing -> wait 300ms after the last key (debounce), skip repeats, cancel the old request (switchMap)
    this.typed$
      .pipe(
        map((v) => v.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        tap((q) => this.suggestLoading.set(q.length >= 2)),
        switchMap((q) => (q.length < 2 ? of([]) : this.productService.suggest(q).pipe(catchError(() => of([]))))),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((list) => {
        this.suggestions.set(list);
        this.activeIdx.set(-1);
        this.suggestLoading.set(false);
      });

    // on /search?q=... keep the words in the box (back button, shared links)
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const tree = this.router.parseUrl(this.router.url);
        if (this.router.url.startsWith('/search')) this.query.set(tree.queryParams['q'] ?? '');
      });

    this.productService.getCategoryMenu().subscribe({
      next: (c) => {
        this.menu.set(c);
        setTimeout(() => this.updateArrows()); // after the list is drawn
      },
    });
  }

  ngOnDestroy() {
    clearTimeout(this.timer);
  }

  // small delays: the menu doesn't flash when the mouse just passes over the bar,
  // and doesn't close while moving from the category name down into the menu
  openMenu(id: string) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.openId.set(id), this.openId() ? 0 : 120);
  }

  closeMenu() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.openId.set(null), 150);
  }

  cancelClose() {
    clearTimeout(this.timer);
  }

  /** show an arrow only on the side that still has hidden categories */
  updateArrows() {
    const el = this.catList()?.nativeElement;
    if (!el) return;
    this.canLeft.set(el.scrollLeft > 4);
    this.canRight.set(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  scrollCats(dir: 1 | -1) {
    const el = this.catList()?.nativeElement;
    if (!el) return;
    this.closeNow();
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  }

  onType(value: string) {
    this.query.set(value);
    this.showSuggest.set(true);
    this.typed$.next(value);
  }

  /** arrows move through suggestions, Enter opens the highlighted one, Escape closes */
  onSearchKey(event: KeyboardEvent) {
    const count = this.suggestions().length;
    if (event.key === 'ArrowDown' && count) {
      event.preventDefault();
      this.activeIdx.update((i) => (i + 1) % count);
    } else if (event.key === 'ArrowUp' && count) {
      event.preventDefault();
      this.activeIdx.update((i) => (i <= 0 ? count - 1 : i - 1));
    } else if (event.key === 'Enter' && this.suggestOpen() && this.activeIdx() >= 0) {
      event.preventDefault();
      this.openSuggestion(this.suggestions()[this.activeIdx()]);
    } else if (event.key === 'Escape') {
      this.showSuggest.set(false);
    }
  }

  /** Enter / "See all results" -> results page */
  submitSearch(event?: Event) {
    event?.preventDefault();
    const q = this.query().trim();
    if (!q) return;
    this.showSuggest.set(false);
    this.router.navigate(['/search'], { queryParams: { q } });
  }

  openSuggestion(s: Suggestion) {
    this.showSuggest.set(false);
    this.router.navigate(['/product', s._id]);
  }

  /** close the dropdown when focus leaves the search box (not when clicking inside it) */
  onSearchBlur(event: FocusEvent) {
    const box = event.currentTarget as HTMLElement;
    if (!box.contains(event.relatedTarget as Node | null)) this.showSuggest.set(false);
  }

  closeNow() {
    clearTimeout(this.timer);
    this.openId.set(null);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
