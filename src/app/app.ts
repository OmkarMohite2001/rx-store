import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './layout/navbar/navbar';
import { Sidebar } from './layout/sidebar/sidebar';
import { MatSidenavModule } from '@angular/material/sidenav';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, RouterOutlet,
    Navbar,
    Sidebar,
    MatSidenavModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('rx-store');
  sidenavOpened = true;
  toggleSidebar():void{
    this.sidenavOpened = !this.sidenavOpened;
  }
}
