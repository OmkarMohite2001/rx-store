import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { CartService } from '../../core/services/cart';

@Component({
  selector: 'app-sidebar',
  imports: [
    AsyncPipe,
    RouterLink,
    RouterLinkActive,
    MatListModule,
    MatIconModule,
    MatBadgeModule,
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  protected authService = inject(AuthService);
  protected cartService = inject(CartService);

  isAuthenticated$ = this.authService.isAuthenticated$;
  cartCount$ = this.cartService.cartCount$;

  logout(): void {
    this.authService.logout();
  }
}
