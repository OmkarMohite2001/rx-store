import { Component, signal } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './layout/navbar/navbar';
import { Sidebar } from './layout/sidebar/sidebar';
import { NotificationComponent } from './shared/notification/notification';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    Navbar,
    Sidebar,
    MatSidenavModule,
    NotificationComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('rx-store');
  sidenavOpened = true;

  toggleSidebar(): void {
    this.sidenavOpened = !this.sidenavOpened;
  }
}
