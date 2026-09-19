import { AsyncPipe } from '@angular/common';
import { Component, inject, output } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { CartService } from '../../core/services/cart';

@Component({
  selector: 'app-navbar',
  imports: [
    AsyncPipe,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    RouterLink,
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  menuClicked = output<void>();

  protected cartService = inject(CartService);
  protected authService = inject(AuthService);

  cartCount$ = this.cartService.cartCount$;
  user$ = this.authService.user$;
  isAuthenticated$ = this.authService.isAuthenticated$;

  toggleMenu(): void {
    this.menuClicked.emit();
  }

  logout(): void {
    this.authService.logout();
  }
}
