import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    localStorage.removeItem('surmesure.selection');
    localStorage.removeItem('surmesure.favorites');
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the brand headline', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Des créations');
  });

  it('saves a favorite and exposes its state accessibly', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.favorite') as HTMLButtonElement;

    expect(button.getAttribute('aria-pressed')).toBe('false');
    button.click();
    fixture.detectChanges();

    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(fixture.componentInstance.favoritesCount).toBe(1);
    expect(JSON.parse(localStorage.getItem('surmesure.favorites') ?? '[]')).toContain(
      fixture.componentInstance.favoriteKey(fixture.componentInstance.creations[0]),
    );
  });

  it('restores the selection after a reload', () => {
    const firstFixture = TestBed.createComponent(App);
    firstFixture.componentInstance.addToCart(firstFixture.componentInstance.creations[0]);
    firstFixture.destroy();

    const reloadedFixture = TestBed.createComponent(App);
    expect(reloadedFixture.componentInstance.cartCount).toBe(1);
  });
});
